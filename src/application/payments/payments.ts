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

export function createPaymentCommands(deps: PaymentsDeps) {
  return {
    /**
     * Sinh QR cho một đơn PENDING còn hạn.
     *
     * Nội dung chuyển khoản chính là `order.orderCode` — đó là hợp đồng để webhook
     * đối chiếu ngược lại, nên không được thay bằng chuỗi tuỳ ý.
     */
    createPaymentRequest(order: Order): Promise<PaymentQr> {
      return deps.provider.createPayment({
        orderCode: order.orderCode,
        amount: order.amount,
        currency: order.currency,
        description: order.orderCode,
        expiresAt: order.expiresAt,
      });
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
