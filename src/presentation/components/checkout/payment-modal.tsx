"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Clock, Loader2, X } from "lucide-react";
import { QrPaymentPanel, type BankTransferDetails } from "@/src/presentation/components/checkout/qr-payment-panel";
import {
  isTerminalStatus,
  useOrderStatusPolling,
  type OrderStatusSnapshot,
} from "@/src/presentation/components/checkout/use-order-status";
import { trans, type Dict } from "@/src/lib/i18n/config";
import { cn } from "@/src/lib/utils";

export type CheckoutStage = "idle" | "creating" | "qr";

export interface PaymentModalProps {
  open: boolean;
  stage: CheckoutStage;
  skillTitle: string;
  skillSlug: string;
  email: string | null;
  errorMessage?: string | null;
  details?: BankTransferDetails | null;
  expiresAt?: string | null;
  orderId: string | null;
  orderCode?: string | null;
  dict: Dict;
  onClose: () => void;
  onRetry: () => void;
  /** Đã thanh toán: dùng để render lại dữ liệu trang (skill vừa được mở khoá). */
  onPaid: () => void;
}

const COUNTDOWN_TICK_MS = 1000;

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** Hết hạn ở client chỉ để hiển thị; nguồn chân lý vẫn là `expiresAt` ở server. */
function useCountdown(expiresAt: string | null | undefined, active: boolean): number {
  const [remaining, setRemaining] = useState(() =>
    expiresAt ? Math.max(0, new Date(expiresAt).getTime() - Date.now()) : 0,
  );

  useEffect(() => {
    if (!expiresAt || !active) return;

    const tick = () => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, COUNTDOWN_TICK_MS);
    return () => clearInterval(timer);
  }, [expiresAt, active]);

  return remaining;
}

export function PaymentModal({
  open,
  stage,
  skillTitle,
  skillSlug,
  email,
  errorMessage,
  details,
  expiresAt,
  orderId,
  orderCode,
  dict,
  onClose,
  onRetry,
  onPaid,
}: PaymentModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const { checkout } = dict;

  const pollingActive = open && stage === "qr" && Boolean(orderId);
  const { snapshot, checking, checkNow } = useOrderStatusPolling(pollingActive ? orderId : null);
  const remaining = useCountdown(expiresAt, pollingActive);

  const status: OrderStatusSnapshot["status"] | null = snapshot?.status ?? null;
  const paid = status === "PAID";
  const expired = status === "EXPIRED" || (pollingActive && remaining <= 0 && !paid);
  const failed = status !== null && isTerminalStatus(status) && !paid && !expired;

  const hasNotifiedPaid = useRef(false);

  useEffect(() => {
    if (paid && !hasNotifiedPaid.current) {
      hasNotifiedPaid.current = true;
      onPaid();
    }
    if (!open) {
      hasNotifiedPaid.current = false;
    }
  }, [onPaid, paid, open]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Khoá scroll nền (bù paddingRight chống giật trang) + trả focus về nút đã mở modal.
  useEffect(() => {
    if (!open || !mounted) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { body } = document;
    const previousOverflow = body.style.overflow;
    const previousPaddingRight = body.style.paddingRight;

    // Tính toán độ rộng thanh cuộn dọc để bù paddingRight, tránh nảy layout đằng sau
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    dialogRef.current?.focus();

    return () => {
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPaddingRight;
      previouslyFocused.current?.focus?.();
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleClose, open, mounted]);

  if (!open || !mounted) return null;

  const showQr = stage === "qr" && Boolean(details) && !paid && !expired && !failed;
  const showError = !paid && !expired && !failed && !showQr && stage !== "creating";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-900/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={handleClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        tabIndex={-1}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-white shadow-2xl outline-none sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0">
            <h2 id="payment-modal-title" className="truncate text-base font-semibold text-zinc-900">
              {checkout.title}
            </h2>
            <p className="mt-0.5 truncate text-sm text-zinc-500">{skillTitle}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label={checkout.close}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="px-5 py-5">
          {stage === "creating" ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Loader2 className="size-6 animate-spin text-zinc-400" aria-hidden="true" />
              <p className="text-sm text-zinc-600">{checkout.creatingOrder}</p>
            </div>
          ) : null}

          {paid ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <CheckCircle2 className="size-10 text-emerald-500" aria-hidden="true" />
              <h3 className="text-base font-semibold text-zinc-900">{checkout.successTitle}</h3>
              <p className="text-sm text-zinc-600">
                {email
                  ? trans(checkout.successBody, { title: skillTitle, email })
                  : trans(checkout.successBodyNoEmail, { title: skillTitle })}
              </p>
              <a
                href={`/skills/${skillSlug}`}
                className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
              >
                {checkout.successCta}
              </a>
            </div>
          ) : null}

          {expired ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Clock className="size-8 text-zinc-400" aria-hidden="true" />
              <h3 className="text-base font-semibold text-zinc-900">{checkout.expiredTitle}</h3>
              <p className="text-sm text-zinc-600">{checkout.expiredBody}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  {checkout.retry}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  {checkout.close}
                </button>
              </div>
            </div>
          ) : null}

          {failed ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <AlertTriangle className="size-8 text-amber-500" aria-hidden="true" />
              <h3 className="text-base font-semibold text-zinc-900">{checkout.failedTitle}</h3>
              <p className="text-sm text-zinc-600">{checkout.failedBody}</p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  {checkout.retry}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  {checkout.close}
                </button>
              </div>
            </div>
          ) : null}

          {showError ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <AlertTriangle className="size-6 text-amber-500" aria-hidden="true" />
              <p className="text-sm text-zinc-700">{errorMessage ?? checkout.errors.createQr}</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
                >
                  {checkout.retry}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
                >
                  {checkout.close}
                </button>
              </div>
            </div>
          ) : null}

          {showQr && details ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <span className="font-medium">
                  {checkout.amount}: {details.amountLabel}
                </span>
                {pollingActive ? (
                  <span className="inline-flex items-center gap-1.5 font-mono tabular-nums">
                    <Clock className="size-4" aria-hidden="true" />
                    {trans(checkout.expiresIn, { time: formatCountdown(remaining) })}
                  </span>
                ) : null}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-zinc-900">{checkout.scanTitle}</h3>
                <p className="mt-1 text-sm text-zinc-600">{checkout.scanBody}</p>
              </div>

              <QrPaymentPanel details={details} dict={dict} />

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => void checkNow()}
                  disabled={checking}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors",
                    "hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60",
                  )}
                >
                  {checking ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                  {checking ? checkout.checking : checkout.checkNow}
                </button>
                <p className="text-center text-xs text-zinc-500">{checkout.waiting}</p>
              </div>
            </div>
          ) : null}
        </div>

        {orderCode ? (
          <footer className="border-t border-zinc-100 px-5 py-3 text-center text-xs text-zinc-500">
            {checkout.orderCode}: <span className="font-mono">{orderCode}</span>
          </footer>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
