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
  /** Ảnh QR do nhà cung cấp (VietQR) render sẵn; null nếu provider không có. */
  qrImageUrl: string | null;
  /** QR được dựng cục bộ từ `qrPayload` — luôn có để dự phòng mạng chậm/chặn. */
  qrDataUrl: string;
  qrPayload: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  description: string;
  /** Thời điểm hết hạn của QR (bằng hạn của order). */
  expiresAt: Date | null;
}

export interface CreatePaymentRequest {
  orderCode: string;
  /** Số tiền theo đơn vị nhỏ nhất của currency. */
  amount: number;
  currency: string;
  description: string;
  expiresAt?: Date | null;
}

export interface VerifiedPayment {
  provider: string;
  providerTransactionId: string;
  status: PaymentStatus;
  paidAt: Date | null;
  rawPayload: Record<string, unknown>;
  /** Số tiền thực nhận theo đơn vị lớn của currency (VND: 49000). */
  amount: number;
  /**
   * Bản ghi chuẩn hoá của webhook để ghi vào `webhook_events` phục vụ đối soát.
   * `null` với provider không cung cấp nhật ký thô (ví dụ provider giả lập).
   *
   * Mã đơn KHÔNG nằm ở đây: việc trích xuất mã đơn từ nội dung chuyển khoản là
   * quy tắc nghiệp vụ, do tầng Application thực hiện bằng `OrderCode`.
   */
  event: VerifiedWebhookEvent | null;
}

/** Thông tin xác thực mà HTTP boundary chuyển xuống cho provider. */
export interface PaymentWebhookContext {
  /** Giá trị header `Authorization`, ví dụ `Apikey <key>`. */
  authorization: string | null;
  /** Header dự phòng chứa API key (`x-api-key`). */
  apiKey: string | null;
}

/**
 * Payload webhook đã chuẩn hoá về một cấu trúc duy nhất, độc lập với cách SePay
 * đặt tên field ở từng phiên bản tài liệu.
 */
export interface VerifiedWebhookEvent {
  /** id của event phía nhà cung cấp, dùng chống ghi trùng. */
  providerEventId: string;
  gateway: string;
  accountNumber: string;
  subAccount: string | null;
  amountIn: number;
  accumulated: number | null;
  code: string | null;
  content: string | null;
  /** `credit` = tiền vào, `debit` = tiền ra. Chỉ `credit` mới mở khoá đơn. */
  transferType: "credit" | "debit";
  referenceNumber: string | null;
  referenceCode: string | null;
  description: string | null;
  transactionDate: string | null;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProvider {
  createPayment(input: CreatePaymentRequest): Promise<PaymentQr>;
  verifyWebhook(payload: unknown, context: PaymentWebhookContext): Promise<VerifiedPayment>;
  reconcile(orderCode: string, amount: number): Promise<VerifiedPayment | null>;
}

export type PaymentConfirmationReason =
  | "ok"
  | "already_processed"
  | "unknown_order"
  | "not_payable"
  | "expired"
  | "amount_mismatch"
  | "recipient_mismatch"
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
  /** Số tiền thực nhận theo đơn vị lớn của currency (VND: 49000). */
  amount: number;
  orderCode: string;
  status: PaymentStatus;
  paidAt: Date | null;
  rawPayload?: Record<string, unknown> | null;
  /** Khoá liên kết với bản ghi webhook đã lưu, phục vụ đối soát. */
  webhookEventId?: string | null;
  /**
   * Số tài khoản nhận tiền mà provider báo (TK ngân hàng gốc).
   * Bắt buộc phải khớp tài khoản shop (hoặc subAccount) để không mở khoá
   * khi tiền vào một tài khoản khác.
   */
  accountNumber?: string | null;
  /**
   * Sub-account / virtual account (tài khoản ảo SePay). SePay gửi TK gốc
   * ở `accountNumber` và TK ảo ở `subAccount`. Ta ưu tiên khớp subAccount
   * trước vì `SEPAY_ACCOUNT_NUMBER` thường cấu hình là số TK ảo.
   */
  subAccount?: string | null;
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

// ---------------------------------------------------------------------------
// Webhook event — nhật ký thô của mọi webhook nhận về
// ---------------------------------------------------------------------------

/**
 * RECEIVED  : đã lưu thô, chưa xác định được đơn hàng (chờ đối soát thủ công).
 * MATCHED   : đã khớp đơn và mở khóa sản phẩm.
 * REJECTED  : có đơn nhưng không hợp lệ (sai số tiền, sai tài khoản, đơn đã hết hạn).
 * FAILED    : không tìm thấy đơn tương ứng với nội dung chuyển khoản.
 */
export type WebhookEventStatus = "RECEIVED" | "MATCHED" | "REJECTED" | "FAILED";

/**
 * Bản ghi thô của một lần SePay bắn webhook.
 *
 * Mục đích: đối soát (reconciliation), chống trùng lặp và debug. Bảng này
 * được ghi cho MỌI webhook hợp lệ về mặt xác thực, kể cả khi không tìm thấy
 * đơn hàng — vì tiền đã vào tài khoản thì phải có đường truy vết.
 */
export interface WebhookEvent {
  id: string;
  provider: string;
  /** id của event phía nhà cung cấp, dùng chống ghi trùng. */
  providerEventId: string;
  gateway: string;
  accountNumber: string;
  subAccount: string | null;
  amountIn: number;
  accumulated: number | null;
  code: string | null;
  content: string | null;
  transferType: "credit" | "debit" | null;
  referenceNumber: string | null;
  referenceCode: string | null;
  description: string | null;
  transactionDate: string | null;
  status: WebhookEventStatus;
  failureReason: string | null;
  orderId: string | null;
  orderCode: string | null;
  rawPayload: Record<string, unknown>;
  receivedAt: Date;
  processedAt: Date | null;
}

export interface RecordWebhookEventInput extends VerifiedWebhookEvent {
  provider: string;
}

export interface WebhookEventRepository {
  /**
   * Ghi bản ghi thô. Trả về `duplicate: true` nếu event đã tồn tại — lúc đó
   * KHÔNG ghi đè và KHÔNG xử lý lại nghiệp vụ (webhook có thể gửi lặp).
   */
  record(input: RecordWebhookEventInput): Promise<{ id: string; duplicate: boolean }>;
  /** Cập nhật kết quả xử lý sau khi đã quyết định: khớp đơn, từ chối hay thất bại. */
  markResolved(
    id: string,
    outcome: {
      status: WebhookEventStatus;
      orderId?: string | null;
      orderCode?: string | null;
      failureReason?: string | null;
    },
  ): Promise<void>;
  findByProviderEventId(provider: string, providerEventId: string): Promise<WebhookEvent | null>;
  listForAdmin(
    filters: { status?: WebhookEventStatus },
    pagination: Pagination,
  ): Promise<PaginatedResult<WebhookEvent>>;
  countByStatus(): Promise<Record<WebhookEventStatus, number>>;
}
