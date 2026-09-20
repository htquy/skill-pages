import { randomUUID } from "node:crypto";
import QRCode from "qrcode";
import { getOptionalEnv } from "@/src/lib/env";
import type {
  CreatePaymentRequest,
  PaymentProvider,
  PaymentQr,
  VerifiedPayment,
} from "@/src/domain/payments";

const MOCK_BANK = {
  bankName: "VIETCOMBANK",
  accountNumber: "0011001234567",
  accountHolder: "PROMPTWORKS OPS",
};

interface WebhookPayload {
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

export const mockPaymentProvider: PaymentProvider = {
  async createPayment(input: CreatePaymentRequest): Promise<PaymentQr> {
    const qrPayload = [
      `bank=${MOCK_BANK.bankName}`,
      `account=${MOCK_BANK.accountNumber}`,
      `amount=${input.amount}`,
      `ref=${input.orderCode}`,
      `note=${input.description}`,
    ].join("\n");

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#18181b", light: "#ffffff" },
    });

    return {
      provider: "MOCK_QR",
      qrDataUrl,
      qrPayload,
      bankName: MOCK_BANK.bankName,
      accountNumber: MOCK_BANK.accountNumber,
      accountHolder: MOCK_BANK.accountHolder,
      description: input.description,
    };
  },

  async verifyWebhook(payload: unknown, signature?: string): Promise<VerifiedPayment> {
    const secret = getOptionalEnv("PAYMENT_WEBHOOK_SECRET");
    if (secret && signature !== secret) {
      throw new Error("Invalid webhook signature");
    }

    const body = (payload ?? {}) as WebhookPayload;
    const orderCode = typeof body.orderCode === "string" ? body.orderCode : "";
    const amount = numberValue(body.amount);
    const transactionId =
      typeof body.transactionId === "string" && body.transactionId.length > 0
        ? body.transactionId
        : `mock-${randomUUID()}`;
    const status = typeof body.status === "string" ? body.status : "SUCCESS";

    if (!orderCode || amount === null) {
      throw new Error("Malformed webhook payload");
    }

    return {
      provider: "MOCK_QR",
      providerTransactionId: transactionId,
      orderCode,
      amount,
      status: status === "SUCCESS" ? "SUCCESS" : "FAILED",
      paidAt: status === "SUCCESS" ? new Date() : null,
      rawPayload: { ...(body as object), signature: signature ? "present" : "absent" },
    };
  },

  async reconcile(): Promise<VerifiedPayment | null> {
    return null;
  },
};