import type {
  AppRepository,
  AppRecord,
  AppMenuItemRecord,
  SubscriptionPlanRecord,
  EvaluatedMenuItem,
  UserAppEntitlement,
  MenuAccess,
  AppType,
  UserSubscriptionRecord,
  FeatureRecord,
  PlanPriceRecord,
  PurchasablePlanPrice,
} from "@/src/domain/apps/entities";
import type { UserRepository } from "@/src/domain/identity/entities";
import { NotFoundError, ValidationError } from "@/src/domain/errors";
import { daysUntil, MAX_PLAN_MONTHS, nextPeriod } from "@/src/domain/apps/subscription-period";

export interface PlanPriceInput {
  months: number;
  amount: number;
  currency?: string;
  isActive?: boolean;
}

export interface AppsService {
  listActiveApps(): Promise<Array<AppRecord & { plans: SubscriptionPlanRecord[] }>>;
  getApp(slug: string): Promise<{ app: AppRecord; plans: SubscriptionPlanRecord[] }>;
  getAppMenusForUser(slug: string, userId: string | null): Promise<EvaluatedMenuItem[]>;
  checkUserAppAccess(slug: string, userId: string): Promise<UserAppEntitlement>;

  /** Facade cho module orders: kỳ hạn còn bán được không, giá bao nhiêu (server quyết định giá). */
  findPurchasablePrice(priceId: string): Promise<PurchasablePlanPrice | null>;
  /** true khi user đã có gói vĩnh viễn của plan này (mua thêm là vô nghĩa). */
  hasLifetime(userId: string, planId: string): Promise<boolean>;
  /** Cấp kỳ đăng ký cho một đơn đã thanh toán. Idempotent theo orderId. */
  fulfilPaidPlanOrder(input: { orderId: string; userId: string; planPriceId: string }): Promise<UserSubscriptionRecord>;
  hasSubscriptionForOrder(orderId: string): Promise<boolean>;
  revokeSubscriptionForOrder(orderId: string): Promise<void>;

  /** Toàn bộ cấu hình của một app để hiển thị ở trang admin. */
  adminListAppConfig(slug: string): Promise<{
    app: AppRecord;
    plans: SubscriptionPlanRecord[];
    menus: AppMenuItemRecord[];
    features: FeatureRecord[];
  }>;

  adminCreateApp(data: {
    slug: string;
    name: string;
    description?: string | null;
    type?: AppType;
  }): Promise<AppRecord>;

  adminCreatePlan(data: {
    appId: string;
    name: string;
    description?: string | null;
    sortOrder?: number;
    featureKeys?: string[];
    prices?: PlanPriceInput[];
  }): Promise<SubscriptionPlanRecord>;

  adminUpdatePlan(slug: string, planId: string, data: {
    name?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    featureKeys?: string[];
  }): Promise<SubscriptionPlanRecord>;

  adminUpsertPlanPrice(slug: string, planId: string, data: PlanPriceInput): Promise<PlanPriceRecord>;

  adminCreateMenuItem(data: {
    appId: string;
    parentId?: string | null;
    label: string;
    path?: string | null;
    icon?: string | null;
    sortOrder?: number;
    access?: MenuAccess;
    requiredFeatureKey?: string | null;
  }): Promise<AppMenuItemRecord>;

  /** Admin cấp/gia hạn tay: `months` (0 = vĩnh viễn). Cùng gói còn hạn thì cộng dồn. */
  adminGrantSubscription(data: {
    userId: string;
    appSlug: string;
    planId: string;
    months: number;
  }): Promise<UserSubscriptionRecord>;
}

function validatePrice(input: PlanPriceInput) {
  if (!Number.isInteger(input.months) || input.months < 0 || input.months > MAX_PLAN_MONTHS) {
    throw new ValidationError(`Số tháng phải là số nguyên 0..${MAX_PLAN_MONTHS} (0 = vĩnh viễn)`);
  }
  if (!Number.isInteger(input.amount) || input.amount < 0) {
    throw new ValidationError("Giá phải là số nguyên không âm (đơn vị nhỏ nhất của tiền tệ)");
  }
}

export function createAppsService(deps: {
  apps: AppRepository;
  users: UserRepository;
  now?: () => Date;
}): AppsService {
  const { apps, users } = deps;
  const now = deps.now ?? (() => new Date());

  async function requireApp(slug: string): Promise<AppRecord> {
    const app = await apps.findAppBySlug(slug);
    if (!app) throw new NotFoundError(`App '${slug}' not found`);
    return app;
  }

  async function requirePlanOfApp(slug: string, planId: string): Promise<SubscriptionPlanRecord> {
    const app = await requireApp(slug);
    const plan = await apps.findPlanById(planId);
    if (!plan || plan.appId !== app.id) throw new NotFoundError("Gói không thuộc ứng dụng này");
    return plan;
  }

  /** Tính quyền tại thời điểm `at`: hợp các tính năng của mọi kỳ đang hiệu lực. */
  async function evaluate(userId: string, appId: string, at: Date) {
    const current = await apps.listCurrentUserSubscriptions(userId, appId, at);
    if (current.length === 0) return null;
    const unexpired = await apps.listUnexpiredUserSubscriptions(userId, appId, at);
    const planIds = [...new Set(current.map((s) => s.planId))];
    const plans = (await Promise.all(planIds.map((id) => apps.findPlanById(id)))).filter(
      (p): p is SubscriptionPlanRecord => p !== null,
    );
    const features = new Set<string>();
    for (const plan of plans) plan.featureKeys.forEach((key) => features.add(key));

    // Hạn cuối: nếu có kỳ vĩnh viễn thì null, ngược lại là ngày kết thúc xa nhất của chuỗi các gói đang dùng.
    const chain = unexpired.filter((s) => planIds.includes(s.planId));
    const lifetime = chain.some((s) => s.endsAt === null);
    const endsAt = lifetime
      ? null
      : chain.reduce<Date | null>((max, s) => (max === null || s.endsAt! > max ? s.endsAt! : max), null);
    const primary = current.find((s) => s.endsAt === null) ?? current[current.length - 1];
    return { current, primary, plans, features, endsAt, lifetime };
  }

  function buildMenuTree(
    items: AppMenuItemRecord[],
    hasActiveSub: boolean,
    unlockedFeatureKeys: Set<string>,
  ): EvaluatedMenuItem[] {
    const map = new Map<string, EvaluatedMenuItem>();
    const roots: EvaluatedMenuItem[] = [];

    for (const item of items) {
      let isAccessible = true;
      let isLocked = false;
      let lockReason: "REQUIRE_SUBSCRIPTION" | "REQUIRE_FEATURE" | null = null;

      if (item.access === "PAID") {
        if (!hasActiveSub) {
          isAccessible = false;
          isLocked = true;
          lockReason = "REQUIRE_SUBSCRIPTION";
        } else if (item.requiredFeatureKey && !unlockedFeatureKeys.has(item.requiredFeatureKey)) {
          isAccessible = false;
          isLocked = true;
          lockReason = "REQUIRE_FEATURE";
        }
      }

      map.set(item.id, {
        id: item.id,
        label: item.label,
        path: item.path,
        icon: item.icon,
        access: item.access,
        requiredFeature: item.requiredFeatureKey ?? null,
        isAccessible,
        isLocked,
        lockReason,
        children: [],
      });
    }

    for (const item of items) {
      const node = map.get(item.id)!;
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }

  return {
    async listActiveApps() {
      const appList = await apps.listActiveApps();
      const results = [];
      for (const a of appList) {
        const plans = await apps.listPlansForApp(a.id, true);
        results.push({ ...a, plans });
      }
      return results;
    },

    async getApp(slug: string) {
      const app = await requireApp(slug);
      const plans = await apps.listPlansForApp(app.id, true);
      return { app, plans };
    },

    async getAppMenusForUser(slug: string, userId: string | null) {
      const app = await requireApp(slug);
      const allItems = await apps.listMenuItemsForApp(app.id);
      const state = userId ? await evaluate(userId, app.id, now()) : null;
      return buildMenuTree(allItems, state !== null, state?.features ?? new Set());
    },

    async checkUserAppAccess(slug: string, userId: string): Promise<UserAppEntitlement> {
      const app = await requireApp(slug);
      const user = await users.findById(userId);
      if (!user) throw new NotFoundError(`User '${userId}' not found`);

      const at = now();
      const state = await evaluate(userId, app.id, at);
      const base = {
        app: { id: app.id, slug: app.slug, name: app.name, type: app.type },
        user: { id: user.id, email: user.email, name: user.name },
        serverTime: at,
      };

      if (!state) {
        return {
          ...base,
          isPaid: false,
          hasActiveSubscription: false,
          status: "NO_SUBSCRIPTION",
          subscription: null,
          unlockedFeatures: [],
        };
      }

      return {
        ...base,
        isPaid: true,
        hasActiveSubscription: true,
        status: "ACTIVE",
        subscription: {
          id: state.primary.id,
          planId: state.primary.planId,
          planName: state.plans.map((p) => p.name).join(" + ") || state.primary.planName || "Subscription",
          startsAt: state.current[0].startsAt,
          endsAt: state.endsAt,
          daysRemaining: daysUntil(state.endsAt, at) ?? 99999,
          isLifetime: state.lifetime,
        },
        unlockedFeatures: [...state.features].sort(),
      };
    },

    async findPurchasablePrice(priceId: string) {
      const price = await apps.findPlanPriceById(priceId);
      if (!price || !price.isActive || !price.plan.isActive) return null;
      const app = await apps.findAppById(price.plan.appId);
      if (!app || app.status !== "ACTIVE") return null;
      return {
        priceId: price.id,
        months: price.months,
        amount: price.amount,
        currency: price.currency,
        planId: price.plan.id,
        planName: price.plan.name,
        appId: app.id,
        appSlug: app.slug,
        appName: app.name,
      };
    },

    async hasLifetime(userId: string, planId: string) {
      const plan = await apps.findPlanById(planId);
      if (!plan) return false;
      const unexpired = await apps.listUnexpiredUserSubscriptions(userId, plan.appId, now());
      return unexpired.some((s) => s.planId === planId && s.endsAt === null);
    },

    async fulfilPaidPlanOrder({ orderId, userId, planPriceId }) {
      const existing = await apps.findSubscriptionByOrderId(orderId);
      if (existing) return existing;
      // Không lọc isActive: khách đã trả tiền thì vẫn được giao dù admin vừa ngừng bán kỳ hạn này.
      const price = await apps.findPlanPriceById(planPriceId);
      if (!price) throw new NotFoundError(`Plan price '${planPriceId}' not found`);
      const at = now();
      const unexpired = await apps.listUnexpiredUserSubscriptions(userId, price.plan.appId, at);
      const period = nextPeriod(unexpired, price.plan.id, price.months, at);
      return apps.grantSubscription({
        userId,
        appId: price.plan.appId,
        planId: price.plan.id,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
        orderId,
      });
    },

    async hasSubscriptionForOrder(orderId: string) {
      return (await apps.findSubscriptionByOrderId(orderId)) !== null;
    },

    async revokeSubscriptionForOrder(orderId: string) {
      await apps.cancelSubscriptionByOrderId(orderId);
    },

    async adminListAppConfig(slug: string) {
      const app = await requireApp(slug);
      const [plans, menus, features] = await Promise.all([
        apps.listPlansForApp(app.id, false),
        apps.listMenuItemsForApp(app.id),
        apps.listFeatures(),
      ]);
      return { app, plans, menus, features };
    },

    async adminCreateApp(data) {
      return apps.createApp(data);
    },

    async adminCreatePlan(data) {
      if (!data.name?.trim()) throw new ValidationError("Cần tên gói");
      (data.prices ?? []).forEach(validatePrice);
      return apps.createPlan({ ...data, name: data.name.trim() });
    },

    async adminUpdatePlan(slug, planId, data) {
      await requirePlanOfApp(slug, planId);
      return apps.updatePlan(planId, data);
    },

    async adminUpsertPlanPrice(slug, planId, data) {
      await requirePlanOfApp(slug, planId);
      validatePrice(data);
      return apps.upsertPlanPrice(planId, data);
    },

    async adminCreateMenuItem(data) {
      return apps.createMenuItem(data);
    },

    async adminGrantSubscription(data) {
      const plan = await requirePlanOfApp(data.appSlug, data.planId);
      validatePrice({ months: data.months, amount: 0 });
      const user = await users.findById(data.userId);
      if (!user) throw new NotFoundError(`User '${data.userId}' not found`);
      const at = now();
      const unexpired = await apps.listUnexpiredUserSubscriptions(data.userId, plan.appId, at);
      const period = nextPeriod(unexpired, plan.id, data.months, at);
      return apps.grantSubscription({
        userId: data.userId,
        appId: plan.appId,
        planId: plan.id,
        startsAt: period.startsAt,
        endsAt: period.endsAt,
      });
    },
  };
}

