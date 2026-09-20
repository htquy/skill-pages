import type { PaginatedResult, Pagination } from "@/src/domain/shared";

export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REVERSED" | "REFUNDED";

export interface PaymentTransaction {
  id: string;
  orderId: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  status: PaymentStatus;
  rawPayload: Record<string, unknown> | null;
  paidAt: Date | null;
  verifiedAt: Date | null;
  createdAt: Date;
}

export interface PaymentTransactionView extends PaymentTransaction {
  orderCode: string;
  skillTitle: string;
}

export interface PaymentQr {
  provider: string;
  qrDataUrl: string;
  qrPayload: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  description: string;
}

export interface CreatePaymentRequest {
  orderCode: string;
  amount: number;
  currency: string;
  description: string;
}

export interface VerifiedPayment {
  provider: string;
  providerTransactionId: string;
  orderCode: string;
  amount: number;
  status: PaymentStatus;
  paidAt: Date | null;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProvider {
  createPayment(input: CreatePaymentRequest): Promise<PaymentQr>;
  verifyWebhook(payload: unknown, signature?: string): Promise<VerifiedPayment>;
  reconcile(orderCode: string, amount: number): Promise<VerifiedPayment | null>;
}

export type PaymentConfirmationReason =
  | "ok"
  | "already_processed"
  | "unknown_order"
  | "not_payable"
  | "amount_mismatch"
  | "failed";

export interface PaymentConfirmationResult {
  handled: boolean;
  reason: PaymentConfirmationReason;
  orderId: string | null;
  orderCode: string | null;
}

export interface ConfirmPaymentInput {
  providerTransactionId: string;
  provider: string;
  amount: number;
  orderCode: string;
  status: PaymentStatus;
  paidAt: Date | null;
  rawPayload?: Record<string, unknown> | null;
}

/**
 * Infrastructure-owned transactional execution boundary. Keeps application
 * logic independent of Prisma while guaranteeing the idempotency invariants:
 * one transaction id => one PaymentTransaction, one paid Order, one access.
 */
export interface PaymentGatewayService {
  confirmPayment(input: ConfirmPaymentInput): Promise<PaymentConfirmationResult>;
}

export interface PaymentTransactionRepository {
  findByProviderTransactionId(id: string): Promise<PaymentTransaction | null>;
  create(input: {
    orderId: string;
    provider: string;
    providerTransactionId: string;
    amount: number;
    status: PaymentStatus;
    rawPayload?: Record<string, unknown> | null;
    paidAt?: Date | null;
    verifiedAt?: Date | null;
  }): Promise<PaymentTransaction>;
  listForAdmin(pagination: Pagination): Promise<PaginatedResult<PaymentTransactionView>>;
}