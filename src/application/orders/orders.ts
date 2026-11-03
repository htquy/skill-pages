import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/src/domain/errors";
import type { CurrentUser } from "@/src/domain/identity/entities";
import { ProductType, type Order, type OrderRepository } from "@/src/domain/orders";
import type { SkillAccessRepository } from "@/src/domain/access";
import type { SkillRepository } from "@/src/domain/skill";
import type { PurchasablePlanPrice } from "@/src/domain/apps/entities";
import { periodLabel } from "@/src/domain/apps/subscription-period";

/** Cổng sang module apps (facade). Khi apps tách thành service riêng chỉ cần đổi phần cài đặt này sang HTTP. */
export interface PlanCatalogPort {
  findPurchasablePrice(priceId: string): Promise<PurchasablePlanPrice | null>;
  hasLifetime(userId: string, planId: string): Promise<boolean>;
  fulfilPaidPlanOrder(input: { orderId: string; userId: string; planPriceId: string }): Promise<unknown>;
  hasSubscriptionForOrder(orderId: string): Promise<boolean>;
}

export interface OrderDeps {
  orders: OrderRepository;
  skills: SkillRepository;
  access: SkillAccessRepository;
  plans: PlanCatalogPort;
}

export interface CreateOrderResult {
  order: Order;
  /** true = đã có đơn PENDING còn hạn, tái sử dụng thay vì tạo đơn mới. */
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
    /**
     * Tạo đơn cho một skill trả phí.
     *
     * Server tự quyết định user, skill, giá và mã đơn — client không được gửi
     * `userId`, `amount` hay `status` (xem README — Security invariants).
     */
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
        email: user.email,
        productType: ProductType.SKILL,
        skillId,
        amount: skill.price.amount,
        currency: skill.price.currency,
        expiresInMinutes: DEFAULT_ORDER_MINUTES,
      });

      return { order, existing: false };
    },

    /**
     * Tạo đơn mua một kỳ hạn gói app (1/6/12 tháng, vĩnh viễn). Giá lấy từ server, không tin client.
     * Gia hạn khi còn hạn được phép: thời gian sẽ cộng nối tiếp khi giao.
     */
    async createPlanOrder(user: CurrentUser, planPriceId: string): Promise<CreateOrderResult> {
      const price = await deps.plans.findPurchasablePrice(planPriceId);
      if (!price) {
        throw new NotFoundError("Gói này không còn được bán");
      }
      if (price.amount <= 0) {
        throw new ValidationError("Gói này chưa có giá bán");
      }
      if (await deps.plans.hasLifetime(user.id, price.planId)) {
        throw new ConflictError("Bạn đã có gói vĩnh viễn này");
      }

      const pending = await deps.orders.findValidPendingPlan(user.id, planPriceId);
      if (pending && pending.amount === price.amount && pending.currency === price.currency) {
        return { order: pending, existing: true };
      }

      const order = await deps.orders.create({
        userId: user.id,
        email: user.email,
        productType: ProductType.APP_PLAN,
        planPriceId,
        productTitle: `${price.appName} · ${price.planName} · ${periodLabel(price.months)}`,
        productPath: `/apps/${price.appSlug}/pricing`,
        amount: price.amount,
        currency: price.currency,
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
      if (order.planPriceId) {
        let unlocked = await deps.plans.hasSubscriptionForOrder(order.id);
        if (!unlocked && order.status === "PAID") {
          // Tự phục hồi: đơn đã PAID nhưng bước giao gói sau webhook bị lỗi -> giao lại (idempotent).
          await deps.plans.fulfilPaidPlanOrder({ orderId: order.id, userId: order.userId, planPriceId: order.planPriceId });
          unlocked = true;
        }
        return { orderId: order.id, status: order.status, skillAccess: { unlocked } };
      }
      const access = order.skillId ? await deps.access.findActive(order.userId, order.skillId) : null;
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
