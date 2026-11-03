"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShoppingCart } from "lucide-react";
import { PaymentModal, type CheckoutStage } from "@/src/presentation/components/checkout/payment-modal";
import type { BankTransferDetails } from "@/src/presentation/components/checkout/qr-payment-panel";
import { formatMoney } from "@/src/domain/shared";
import type { Dict } from "@/src/lib/i18n/config";
import { cn } from "@/src/lib/utils";

interface CreatedOrder {
  id: string;
  orderCode: string;
  email: string | null;
  amount: number;
  currency: string;
  expiresAt: string | null;
}

interface PaymentQrResponse {
  qrImageUrl: string | null;
  qrDataUrl: string | null;
  qrPayload: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export interface BuyNowButtonProps {
  /** Mua skill: id skill. Mua gói app: bỏ trống và truyền `planPriceId`. */
  skillId?: string;
  /** Mua một kỳ hạn gói app (1/6/12 tháng...). */
  planPriceId?: string;
  skillSlug: string;
  skillTitle: string;
  /** Trang sản phẩm để quay lại sau đăng nhập/thanh toán; mặc định /skills/<slug>. */
  productPath?: string;
  /** Nhãn nút thay cho "Mua ngay". */
  label?: string;
  dict: Dict;
  variant?: "card" | "detail";
  disabled?: boolean;
}

/**
 * Nút "Mua ngay": tạo đơn -> lấy QR -> mở modal thanh toán.
 *
 * Mọi quyết định nghiệp vụ (giá, mã đơn, hạn đơn) do server quyết định; client
 * chỉ gọi API và hiển thị. Ở bước này không có chuyển tiền nào diễn ra — người
 * dùng quét QR trong modal và webhook SePay mới là nơi xác nhận thanh toán.
 */
export function BuyNowButton({
  skillId,
  planPriceId,
  skillSlug,
  skillTitle,
  productPath,
  label: customLabel,
  dict,
  variant = "card",
  disabled,
}: BuyNowButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<CheckoutStage>("idle");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [order, setOrder] = useState<CreatedOrder | null>(null);
  const [details, setDetails] = useState<BankTransferDetails | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const startCheckout = useCallback(async () => {
    // Tránh race condition khi nhấp chuột dồn dập
    if (loading || stage === "creating") return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setOpen(true);
    setStage("creating");
    setErrorMessage(null);
    setOrder(null);
    setDetails(null);

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(planPriceId ? { planPriceId } : { skillId }),
        signal: controller.signal,
      });

      if (!orderResponse.ok) {
        if (orderResponse.status === 401) {
          // Chưa đăng nhập: đưa sang trang login rồi quay lại đúng skill này.
          setOpen(false);
          router.push(`/login?callbackUrl=${encodeURIComponent(productPath ?? `/skills/${skillSlug}`)}`);
          return;
        }
        const body = (await orderResponse.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(body?.error ?? dict.checkout.errors.createOrder);
        setStage("idle");
        return;
      }

      // API trả `{ order, existing }`: `existing = true` nghĩa là đơn PENDING
      // cũ của chính skill này còn hiệu lực nên được tái sử dụng, không tạo mới.
      const payload = (await orderResponse.json()) as { order: CreatedOrder; existing: boolean };
      const createdOrder = payload.order;
      setOrder(createdOrder);

      const paymentResponse = await fetch(`/api/orders/${createdOrder.id}/payment`, {
        method: "POST",
        signal: controller.signal,
      });
      if (!paymentResponse.ok) {
        const body = (await paymentResponse.json().catch(() => null)) as { error?: string } | null;
        setErrorMessage(body?.error ?? dict.checkout.errors.createQr);
        setStage("idle");
        return;
      }

      const qr = (await paymentResponse.json()) as PaymentQrResponse;
      setDetails({
        bankName: qr.bankName,
        accountNumber: qr.accountNumber,
        accountHolder: qr.accountHolder,
        amountLabel: formatMoney(createdOrder.amount, createdOrder.currency),
        orderCode: createdOrder.orderCode,
        qrImage: qr.qrDataUrl ?? qr.qrImageUrl ?? "",
      });
      setStage("qr");
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setErrorMessage(dict.checkout.errors.network);
        setStage("idle");
      }
    } finally {
      setLoading(false);
    }
  }, [dict, loading, planPriceId, productPath, router, skillId, skillSlug, stage]);

  const close = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setOpen(false);
    setStage("idle");
    setLoading(false);
    setErrorMessage(null);
    setOrder(null);
    setDetails(null);
  }, []);

  const handlePaid = useCallback(() => {
    router.refresh();
  }, [router]);

  const isDisabled = disabled || loading || stage === "creating";
  const label = customLabel ?? dict.checkout.buyNow;
  const buttonClass = cn(
    "disabled:cursor-not-allowed",
    variant === "card"
      ? "inline-flex items-center justify-center gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-all duration-300 ease-fluid hover:border-brand-600 hover:bg-brand-600 hover:text-white hover:shadow-glow active:scale-95 disabled:opacity-60"
      : "btn-primary w-full px-5 py-3 text-sm",
  );

  return (
    <>
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={isDisabled}
        className={buttonClass}
      >
        {loading || stage === "creating" ? (
          <Loader2 className={variant === "card" ? "size-3.5 animate-spin" : "size-4 animate-spin"} />
        ) : (
          <ShoppingCart className={variant === "card" ? "size-3.5" : "size-4"} aria-hidden="true" />
        )}
        {label}
      </button>

      <PaymentModal
        open={open}
        stage={stage}
        skillTitle={skillTitle}
        skillSlug={skillSlug}
        productPath={productPath}
        email={order?.email ?? null}
        errorMessage={errorMessage}
        details={details}
        expiresAt={order?.expiresAt ?? null}
        orderId={order?.id ?? null}
        orderCode={order?.orderCode ?? null}
        dict={dict}
        onClose={close}
        onRetry={() => void startCheckout()}
        onPaid={handlePaid}
      />
    </>
  );
}

