import { randomUUID } from "node:crypto";
import { ValidationError } from "@/src/domain/errors";
import { toMajorUnits } from "@/src/domain/shared";
import { renderQrDataUrl } from "@/src/infrastructure/payment/qr-image";
import type {
  CreatePaymentRequest,
  PaymentProvider,
  PaymentQr,
  VerifiedPayment,
} from "@/src/domain/payments";

const MOCK_BANK = {
  bankName: "BIDV",
  accountNumber: "8813991171",
  accountHolder: "HOANG TRONG QUY",
};

interface WebhookPayload {
  /** Nội dung chuyển khoản chứa mã đơn, giống hành vi thật của SePay. */
  content?: unknown;
  orderCode?: unknown;
  amount?: unknown;
  transactionId?: unknown;
  status?: unknown;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}

/**
 * Provider giả lập cho môi trường local.
 *
 * Tồn tại để chạy/demo luồng mua hàng khi chưa cấu hình SePay. Nó KHÔNG đại diện
 * cho bảo mật thật: không xác thực API key và mã đơn nằm nguyên trong payload.
 * Khi cấu hình SePay, composition root sẽ tự chọn provider thật.
 */
export const mockPaymentProvider: PaymentProvider = {
  async createPayment(input: CreatePaymentRequest): Promise<PaymentQr> {
    const qrPayload = [
      `bank=${MOCK_BANK.bankName}`,
      `account=${MOCK_BANK.accountNumber}`,
      `amount=${toMajorUnits(input.amount, input.currency)}`,
      `ref=${input.orderCode}`,
      `note=${input.description}`,
    ].join("\n");

    const qrDataUrl = await renderQrDataUrl(qrPayload);

    return {
      provider: "MOCK_QR",
      qrImageUrl: null,
      qrDataUrl,
      qrPayload,
      bankName: MOCK_BANK.bankName,
      accountNumber: MOCK_BANK.accountNumber,
      accountHolder: MOCK_BANK.accountHolder,
      description: input.description,
      expiresAt: input.expiresAt ?? null,
    };
  },

  async verifyWebhook(payload: unknown): Promise<VerifiedPayment> {
    const body = (payload ?? {}) as WebhookPayload;
    const content = typeof body.content === "string" ? body.content : "";
    const orderCode = typeof body.orderCode === "string" ? body.orderCode : "";
    const amount = numberValue(body.amount);
    const transactionId =
      typeof body.transactionId === "string" && body.transactionId.length > 0
        ? body.transactionId
        : `mock-${randomUUID()}`;
    const status = typeof body.status === "string" ? body.status : "SUCCESS";

    if ((!content && !orderCode) || amount === null) {
      throw new ValidationError("Malformed mock webhook payload");
    }

    const rawPayload = { ...(body as object) };

    // Provider giả lập vẫn trả về `event` đầy đủ để đi đúng đường đi thật:
    // ghi nhận thô -> trích mã đơn -> đối chiếu tiền -> mở khoá. Nhờ vậy demo
    // local kiểm tra được cả những lỗi mà chỉ xảy ra ở luồng thật.
    return {
      provider: "MOCK_QR",
      providerTransactionId: transactionId,
      amount,
      status: status === "SUCCESS" ? "SUCCESS" : "FAILED",
      paidAt: status === "SUCCESS" ? new Date() : null,
      rawPayload,
      event: {
        providerEventId: transactionId,
        gateway: "MOCK_QR",
        accountNumber: MOCK_BANK.accountNumber,
        subAccount: null,
        amountIn: amount,
        accumulated: null,
        code: orderCode || null,
        content: content || orderCode,
        transferType: "credit",
        referenceNumber: null,
        referenceCode: null,
        description: null,
        transactionDate: new Date().toISOString(),
        rawPayload,
      },
    };
  },

  async reconcile(): Promise<VerifiedPayment | null> {
    return null;
  },
};
