import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/src/domain/errors";
import type { CurrentUser } from "@/src/domain/identity/entities";
import type { Order, OrderRepository } from "@/src/domain/orders";
import type { SkillAccessRepository } from "@/src/domain/access";
import type { SkillRepository } from "@/src/domain/skill";

export interface OrderDeps {
  orders: OrderRepository;
  skills: SkillRepository;
  access: SkillAccessRepository;
}

export interface CreateOrderResult {
  order: Order;
  existing: boolean;
}

export interface OrderStatusResult {
  orderId: string;
  status: Order["status"];
  skillAccess: { unlocked: boolean };
}

const DEFAULT_ORDER_MINUTES = 15;

export function createOrderCommands(deps: OrderDeps) {
  return {
    async createOrder(user: CurrentUser, skillId: string): Promise<CreateOrderResult> {
      const skill = await deps.skills.findPurchaseInfoById(skillId);
      if (!skill) {
        throw new NotFoundError("Skill was not found");
      }
      if (skill.status !== "PUBLISHED") {
        throw new ValidationError("This skill is not available for purchase");
      }
      if (skill.accessType !== "PAID") {
        throw new ValidationError("This skill is free to use");
      }
      if (!skill.price) {
        throw new ValidationError("This skill has not been priced yet");
      }

      const active = await deps.access.findActive(user.id, skillId);
      if (active) {
        throw new ConflictError("You already have access to this skill");
      }

      const pending = await deps.orders.findValidPending(user.id, skillId);
      if (pending) {
        return { order: pending, existing: true };
      }

      const order = await deps.orders.create({
        userId: user.id,
        skillId,
        amount: skill.price.amount,
        currency: skill.price.currency,
        expiresInMinutes: DEFAULT_ORDER_MINUTES,
      });

      return { order, existing: false };
    },

    getCustomerOrders(user: CurrentUser): Promise<Order[]> {
      return deps.orders.listByUser(user.id);
    },

    async getOrderStatus(user: CurrentUser, orderId: string): Promise<OrderStatusResult> {
      const order = await deps.orders.findById(orderId);
      if (!order) {
        throw new NotFoundError("Order was not found");
      }
      if (order.userId !== user.id && user.role !== "ADMIN") {
        throw new ForbiddenError("You can only inspect your own orders");
      }
      const access = await deps.access.findActive(order.userId, order.skillId);
      return {
        orderId: order.id,
        status: order.status,
        skillAccess: { unlocked: Boolean(access) },
      };
    },

    async cancelPendingOrder(user: CurrentUser, orderId: string): Promise<Order> {
      const order = await deps.orders.findById(orderId);
      if (!order) {
        throw new NotFoundError("Order was not found");
      }
      if (order.userId !== user.id) {
        throw new ForbiddenError("You can only cancel your own orders");
      }
      if (order.status !== "PENDING") {
        throw new ConflictError("Only pending orders can be canceled");
      }
      const updated = await deps.orders.updateStatus(orderId, "CANCELED", { canceledAt: new Date() });
      return updated!;
    },

    async expirePendingOrders(): Promise<number> {
      const expired = await deps.orders.listPendingExpired(new Date());
      for (const order of expired) {
        await deps.orders.updateStatus(order.id, "EXPIRED");
      }
      return expired.length;
    },
  };
}
