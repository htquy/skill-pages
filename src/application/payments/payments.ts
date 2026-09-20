import { ConflictError, NotFoundError } from "@/src/domain/errors";
import { AuditAction } from "@/src/domain/audit";
import type { AuditLogRepository } from "@/src/domain/audit";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type { Order, OrderRepository } from "@/src/domain/orders";
import type {
  PaymentGatewayService,
  PaymentProvider,
  PaymentQr,
  PaymentTransactionRepository,
  VerifiedPayment,
} from "@/src/domain/payments";
import type { SkillAccessRepository } from "@/src/domain/access";

export interface PaymentsDeps {
  payments: PaymentTransactionRepository;
  provider: PaymentProvider;
  gateway: PaymentGatewayService;
  orders: OrderRepository;
  access: SkillAccessRepository;
  audit: AuditLogRepository;
}

export interface WebhookContext {
  payload: unknown;
  signature?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface WebhookResult {
  reason: string;
  handled: boolean;
  orderId: string | null;
  orderCode: string | null;
}

export function createPaymentCommands(deps: PaymentsDeps) {
  return {
    createPaymentRequest(order: Order): Promise<PaymentQr> {
      return deps.provider.createPayment({
        orderCode: order.orderCode,
        amount: order.amount,
        currency: order.currency,
        description: `AIPLATFORM ${order.orderCode}`,
      });
    },

    async handlePaymentWebhook(ctx: WebhookContext): Promise<WebhookResult> {
      const verified: VerifiedPayment = await deps.provider.verifyWebhook(ctx.payload, ctx.signature);

      const result = await deps.gateway.confirmPayment({
        providerTransactionId: verified.providerTransactionId,
        provider: verified.provider,
        amount: verified.amount,
        orderCode: verified.orderCode,
        status: verified.status,
        paidAt: verified.paidAt,
        rawPayload: verified.rawPayload,
      });

      if (result.handled && result.reason === "ok" && result.orderId) {
        const order = await deps.orders.findById(result.orderId);
        if (order) {
          await deps.audit.record({
            actorUserId: order.userId,
            action: AuditAction.ORDER_PAID,
            entityType: "Order",
            entityId: order.id,
            metadata: { orderCode: order.orderCode, amount: order.amount },
            ipAddress: ctx.ipAddress,
            userAgent: ctx.userAgent,
          });
        }
      }

      return {
        reason: result.reason,
        handled: result.handled,
        orderId: result.orderId,
        orderCode: result.orderCode,
      };
    },

    async refundPaidOrder(admin: CurrentUser, orderId: string): Promise<Order> {
      const order = await deps.orders.findById(orderId);
      if (!order) {
        throw new NotFoundError("Order was not found");
      }
      if (order.status !== "PAID") {
        throw new ConflictError("Only paid orders can be refunded");
      }

      const updated = await deps.orders.updateStatus(orderId, "REFUNDED", { refundedAt: new Date() });
      await deps.access.revoke(order.userId, order.skillId);
      await deps.audit.record({
        actorUserId: admin.id,
        action: AuditAction.ORDER_REFUNDED,
        entityType: "Order",
        entityId: order.id,
        metadata: { orderCode: order.orderCode, amount: order.amount },
      });
      return updated!;
    },

    listPaymentTransactions(pagination: { page: number; pageSize: number }) {
      return deps.payments.listForAdmin(pagination);
    },
  };
}
