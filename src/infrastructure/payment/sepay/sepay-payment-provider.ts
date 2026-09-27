import { UnauthorizedError, ValidationError } from "@/src/domain/errors";
import { toMajorUnits } from "@/src/domain/shared";
import type {
  CreatePaymentRequest,
  PaymentProvider,
  PaymentQr,
  PaymentWebhookContext,
  VerifiedPayment,
} from "@/src/domain/payments";
import { getSePayConfig } from "@/src/lib/env";
import { isAuthorizedSePayRequest } from "./api-key";
import { parseSePayTransactionDate } from "./transaction-date";
import { renderQrDataUrl } from "@/src/infrastructure/payment/qr-image";
import { buildVietQrUrl } from "@/src/infrastructure/payment/vietqr";
import {
  normalizeSePayWebhook,
  sePayWebhookSchema,
  type SePayWebhookBody,
} from "./schema";

export const SEPAY_PROVIDER = "SEPAY";

/**
 * Adapter thanh toán SePay (BankHub).
 *
 * Trách nhiệm duy nhất của lớp này là "dịch" thế giới bên ngoài về thế giới
 * domain: kiểm tra API key, parse payload, chuẩn hoá field. Mọi quyết định
 * nghiệp vụ (đơn nào hợp lệ, có mở khoá không) thuộc tầng Application.
 */
function parsePayload(payload: unknown): { body: SePayWebhookBody; raw: Record<string, unknown> } {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new ValidationError("SePay webhook payload must be a JSON object");
  }
  const raw = payload as Record<string, unknown>;
  const parsed = sePayWebhookSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError("SePay webhook payload does not match the expected schema");
  }
  return { body: parsed.data, raw };
}

export const sePayPaymentProvider: PaymentProvider = {
  /**
   * Dựng QR VietQR cho một đơn hàng.
   *
   * Ảnh do VietQR render (`qrImageUrl`) là ảnh đẹp, đúng template. Song nếu máy
   * khách chặn api.vietqr.io thì QR vẫn phải dùng được, nên ta luôn dựng thêm một
   * QR cục bộ chứa chính link đó (`qrDataUrl`).
   */
  async createPayment(input: CreatePaymentRequest): Promise<PaymentQr> {
    const config = getSePayConfig();

    const qrImageUrl = buildVietQrUrl(config.vietQrEndpoint, {
      bankCode: config.bankCode,
      accountNumber: config.accountNumber,
      accountName: config.accountName,
      amountMajor: toMajorUnits(input.amount, input.currency),
      addInfo: input.orderCode,
    });

    const qrDataUrl = await renderQrDataUrl(qrImageUrl);

    return {
      provider: SEPAY_PROVIDER,
      qrImageUrl,
      qrDataUrl,
      qrPayload: qrImageUrl,
      bankName: config.bankCode,
      accountNumber: config.accountNumber,
      accountHolder: config.accountName,
      description: input.description,
      expiresAt: input.expiresAt ?? null,
    };
  },

  async verifyWebhook(
    payload: unknown,
    context: PaymentWebhookContext,
  ): Promise<VerifiedPayment> {
    // Bước 1: xác thực. Sai key => 401, không parse payload.
    if (!isAuthorizedSePayRequest(context)) {
      throw new UnauthorizedError("Invalid SePay API key");
    }

    // Bước 2: parse + chuẩn hoá.
    const { body, raw } = parsePayload(payload);

    // Bước 3: chuẩn hoá loại giao dịch. Giao dịch tiền RA (debit/out) vẫn được
    // ghi nhận thô và trả 200, nhưng tầng Application sẽ từ chối mở khoá — trả 400
    // ở đây sẽ khiến SePay retry một payload vốn không bao giờ hợp lệ.
    const event = normalizeSePayWebhook(body, raw);

    return {
      provider: SEPAY_PROVIDER,
      providerTransactionId: event.providerEventId,
      amount: event.amountIn,
      status: "SUCCESS",
      // `event.transactionDate` đã chuẩn hoá thành ISO-8601 UTC nên parse lại ở đây chỉ để lấy Date.
      paidAt: parseSePayTransactionDate(event.transactionDate),
      rawPayload: raw,
      event,
    };
  },

  async reconcile(): Promise<VerifiedPayment | null> {
    // Đối soát chủ động cần gọi API danh sách giao dịch của SePay — chưa bật ở
    // MVP. Hiện tại việc đối soát dựa trên bảng `webhook_events` trong admin.
    return null;
  },
};

