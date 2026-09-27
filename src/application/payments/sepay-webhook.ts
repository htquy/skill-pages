import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import { extractOrderCode } from "@/src/domain/orders";
import type { Order, OrderRepository } from "@/src/domain/orders";
import { formatMoney } from "@/src/domain/shared";
import type {
  PaymentConfirmationReason,
  PaymentGatewayService,
  PaymentProvider,
  PaymentWebhookContext,
  VerifiedPayment,
  WebhookEventRepository,
  WebhookEventStatus,
} from "@/src/domain/payments";
import type { PurchaseDeliveryNotifier } from "@/src/domain/notifications";

export interface SePayWebhookDeps {
  provider: PaymentProvider;
  gateway: PaymentGatewayService;
  events: WebhookEventRepository;
  orders: OrderRepository;
  audit: AuditLogRepository;
  notifier: PurchaseDeliveryNotifier;
  /** Gốc URL công khai, dùng để dựng link trong email bàn giao sản phẩm. */
  siteUrl: string;
}

export interface SePayWebhookInput {
  payload: unknown;
  authorization: string | null;
  apiKey: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type SePayWebhookOutcome =
  | "matched"
  | "already_processed"
  | "duplicate_event"
  | "order_code_not_found"
  | "outgoing_transfer"
  | "unknown_order"
  | "not_payable"
  | "expired"
  | "amount_mismatch"
  | "recipient_mismatch"
  | "payment_failed";

export interface SePayWebhookResult {
  /** SePay coi là thành công khi nhận `{"success": true}`. */
  success: true;
  outcome: SePayWebhookOutcome;
  eventId: string | null;
  orderId: string | null;
  orderCode: string | null;
}

const OUTCOME_DETAIL: Record<SePayWebhookOutcome, string> = {
  matched: "Payment verified and access granted",
  already_processed: "Payment transaction was already processed",
  duplicate_event: "Duplicate webhook event, already resolved",
  order_code_not_found: "No order code found in the transfer content",
  outgoing_transfer: "Outgoing transfer reported on the receiving account",
  unknown_order: "Transfer content does not match any order",
  not_payable: "Order is not in a payable state",
  expired: "Order expired before the transfer arrived",
  amount_mismatch: "Transferred amount does not match the order amount",
  recipient_mismatch: "Transfer landed on an unexpected account number",
  payment_failed: "Payment provider reported a failure",
};

const REJECTION_STATUS: Partial<Record<SePayWebhookOutcome, WebhookEventStatus>> = {
  not_payable: "REJECTED",
  expired: "REJECTED",
  amount_mismatch: "REJECTED",
  recipient_mismatch: "REJECTED",
  unknown_order: "FAILED",
  order_code_not_found: "FAILED",
  outgoing_transfer: "REJECTED",
  payment_failed: "FAILED",
};

const PAYMENT_REASON_TO_OUTCOME: Record<PaymentConfirmationReason, SePayWebhookOutcome> = {
  ok: "matched",
  already_processed: "already_processed",
  unknown_order: "unknown_order",
  not_payable: "not_payable",
  expired: "expired",
  amount_mismatch: "amount_mismatch",
  recipient_mismatch: "recipient_mismatch",
  failed: "payment_failed",
};

function outcomeStatus(outcome: SePayWebhookOutcome): WebhookEventStatus {
  if (outcome === "matched" || outcome === "already_processed" || outcome === "duplicate_event") {
    return "MATCHED";
  }
  return REJECTION_STATUS[outcome] ?? "RECEIVED";
}

/** Trích mã đơn từ nội dung chuyển khoản (và mã thanh toán) của SePay. */
function readOrderCode(verified: VerifiedPayment): string | null {
  if (!verified.event) return null;
  return extractOrderCode(verified.event.content) ?? extractOrderCode(verified.event.code);
}

async function markEvent(
  deps: SePayWebhookDeps,
  eventId: string | null,
  outcome: SePayWebhookOutcome,
  orderId: string | null,
  orderCode: string | null,
): Promise<void> {
  if (!eventId) return;
  await deps.events.markResolved(eventId, {
    status: outcomeStatus(outcome),
    orderId,
    orderCode,
    failureReason: OUTCOME_DETAIL[outcome],
  });
}

/**
 * Sau khi đơn đã PAID: ghi audit + gửi email bàn giao link sản phẩm.
 *
 * Lỗi gửi email KHÔNG được làm hỏng kết quả thanh toán (khách vẫn có quyền
 * truy cập trong tài khoản và có thể tải lại), nên được bắt riêng và ghi log để
 * đối soát thay vì làm request webhook thất bại.
 */
async function fulfilOrder(
  deps: SePayWebhookDeps,
  order: Order,
  input: SePayWebhookInput,
): Promise<void> {
  await deps.audit.record({
    actorUserId: order.userId,
    action: AuditAction.ORDER_PAID,
    entityType: "Order",
    entityId: order.id,
    metadata: {
      orderCode: order.orderCode,
      amount: order.amount,
      currency: order.currency,
      productType: order.productType,
    },
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
  });

  if (!order.email) return;

  try {
    await deps.notifier.sendPurchaseConfirmation({
      to: order.email,
      recipientName: order.customerName,
      orderCode: order.orderCode,
      productTitle: order.skillTitle,
      productUrl: `${deps.siteUrl}/skills/${order.skillSlug}`,
      amountLabel: formatMoney(order.amount, order.currency),
      paidAt: order.paidAt ?? new Date(),
    });
  } catch (error) {
    console.error("[sepay-webhook] purchase email failed", {
      orderId: order.id,
      orderCode: order.orderCode,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Use case: nhận & xử lý webhook SePay.
 *
 * Đây là nguồn xác nhận thanh toán DUY NHẤT — không có đường nào khác được phép
 * set `PAID`. Thứ tự bắt buộc:
 *
 *   xác thực API key -> ghi nhật ký thô -> trích mã đơn -> đối chiếu tiền
 *   -> transaction DB -> mở khoá -> audit -> gửi email bàn giao
 *
 * Nhật ký thô được ghi TRƯỚC bước đối chiếu: nếu không tìm thấy đơn thì tiền vẫn
 * đã vào tài khoản và phải còn đường truy vết để đối soát thủ công.
 */
export function createSePayWebhookHandler(deps: SePayWebhookDeps) {
  async function settle(
    input: SePayWebhookInput,
    eventId: string | null,
    verified: VerifiedPayment,
  ): Promise<SePayWebhookResult> {
    const orderCode = readOrderCode(verified);

    // Tiền RA không bao giờ mở khoá đơn. Vẫn trả 200 (đã ghi nhận thô) để SePay
    // không retry, nhưng đánh dấu REJECTED để admin thấy ngay khi có chuyển
    // khoản bất thường ra khỏi tài khoản nhận tiền.
    if (verified.event?.transferType === "debit") {
      await markEvent(deps, eventId, "outgoing_transfer", null, orderCode);
      return { success: true, outcome: "outgoing_transfer", eventId, orderId: null, orderCode };
    }

    if (!orderCode) {
      await markEvent(deps, eventId, "order_code_not_found", null, null);
      return { success: true, outcome: "order_code_not_found", eventId, orderId: null, orderCode: null };
    }

    const result = await deps.gateway.confirmPayment({
      providerTransactionId: verified.providerTransactionId,
      provider: verified.provider,
      amount: verified.amount,
      orderCode,
      status: verified.status,
      paidAt: verified.paidAt,
      rawPayload: verified.rawPayload,
      webhookEventId: eventId,
      accountNumber: verified.event?.accountNumber ?? null,
      subAccount: verified.event?.subAccount ?? null,
    });

    const outcome = PAYMENT_REASON_TO_OUTCOME[result.reason];
    const resolvedOrderCode = result.orderCode ?? orderCode;
    await markEvent(deps, eventId, outcome, result.orderId, resolvedOrderCode);

    if (outcome === "matched" && result.orderId) {
      const order = await deps.orders.findById(result.orderId);
      if (order) {
        await fulfilOrder(deps, order, input);
      }
    }

    return {
      success: true,
      outcome,
      eventId,
      orderId: result.orderId,
      orderCode: resolvedOrderCode,
    };
  }

  return {
    async handle(input: SePayWebhookInput): Promise<SePayWebhookResult> {
      const context: PaymentWebhookContext = {
        authorization: input.authorization,
        apiKey: input.apiKey,
      };

      // Ném UnauthorizedError (401) khi sai API key, ValidationError (400) khi
      // payload sai cấu trúc. Route boundary chịu trách nhiệm map sang HTTP.
      const verified = await deps.provider.verifyWebhook(input.payload, context);

      const event = verified.event;
      if (!event) {
        // Provider không cung cấp nhật ký thô (chỉ xảy ra với provider giả lập).
        return settle(input, null, verified);
      }

      const recorded = await deps.events.record({ provider: verified.provider, ...event });

      if (recorded.duplicate) {
        const existing = await deps.events.findByProviderEventId(
          verified.provider,
          event.providerEventId,
        );
        // Chỉ bỏ qua nếu lần trước ĐÃ xử lý xong. Bản ghi còn ở trạng thái
        // RECEIVED nghĩa là lần trước bị giữa chừng => phải chạy lại để không mất tiền.
        if (existing && existing.status !== "RECEIVED") {
          return {
            success: true,
            outcome: "duplicate_event",
            eventId: existing.id,
            orderId: existing.orderId,
            orderCode: existing.orderCode,
          };
        }
      }

      return settle(input, recorded.id, verified);
    },
  };
}
