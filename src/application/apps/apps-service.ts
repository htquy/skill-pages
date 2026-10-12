import type {
  AppRepository,
  AppRecord,
  AppMenuItemRecord,
  SubscriptionPlanRecord,
  EvaluatedMenuItem,
  UserAppEntitlement,
  SubscriptionInterval,
  MenuAccess,
  AppType,
  UserSubscriptionRecord,
  FeatureRecord,
} from "@/src/domain/apps/entities";
import type { UserRepository } from "@/src/domain/identity/entities";

export interface AppsService {
  listActiveApps(): Promise<Array<AppRecord & { plans: SubscriptionPlanRecord[] }>>;
  getApp(slug: string): Promise<{ app: AppRecord; plans: SubscriptionPlanRecord[] }>;
  getAppMenusForUser(slug: string, userId: string | null): Promise<EvaluatedMenuItem[]>;
  checkUserAppAccess(slug: string, userId: string): Promise<UserAppEntitlement>;

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
    currency?: string;
    price: number;
    interval?: SubscriptionInterval;
    durationDays?: number;
    featureKeys?: string[];
  }): Promise<SubscriptionPlanRecord>;

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

  adminGrantSubscription(data: {
    userId: string;
    appSlug: string;
    planId: string;
    durationDays?: number;
  }): Promise<UserSubscriptionRecord>;
}

export function createAppsService(deps: {
  apps: AppRepository;
  users: UserRepository;
}): AppsService {
  const { apps, users } = deps;

  function buildMenuTree(
    items: AppMenuItemRecord[],
    hasActiveSub: boolean,
    unlockedFeatureKeys: Set<string>,
  ): EvaluatedMenuItem[] {
    const map = new Map<string, EvaluatedMenuItem>();
    const roots: EvaluatedMenuItem[] = [];

    // First pass: create evaluated items
    for (const item of items) {
      let isAccessible = true;
      let isLocked = false;
      let lockReason: "REQUIRE_SUBSCRIPTION" | "REQUIRE_FEATURE" | null = null;

      if (item.access === "PAID") {
        if (!hasActiveSub) {
          isAccessible = false;
          isLocked = true;
          lockReason = "REQUIRE_SUBSCRIPTION";
        } else if (item.requiredFeatureKey) {
          if (!unlockedFeatureKeys.has(item.requiredFeatureKey)) {
            isAccessible = false;
            isLocked = true;
            lockReason = "REQUIRE_FEATURE";
          }
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

    // Second pass: attach children to parents
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
      const app = await apps.findAppBySlug(slug);
      if (!app) {
        throw new Error(`App '${slug}' not found`);
      }
      const plans = await apps.listPlansForApp(app.id, true);
      return { app, plans };
    },

    async getAppMenusForUser(slug: string, userId: string | null) {
      const app = await apps.findAppBySlug(slug);
      if (!app) {
        throw new Error(`App '${slug}' not found`);
      }

      const allItems = await apps.listMenuItemsForApp(app.id);

      let hasActiveSub = false;
      const unlockedFeatures = new Set<string>();

      if (userId) {
        const sub = await apps.findActiveUserSubscription(userId, app.id);
        if (sub) {
          hasActiveSub = true;
          const plan = await apps.findPlanById(sub.planId);
          if (plan) {
            plan.featureKeys.forEach((f) => unlockedFeatures.add(f));
          }
        }
      }

      return buildMenuTree(allItems, hasActiveSub, unlockedFeatures);
    },

    async checkUserAppAccess(slug: string, userId: string): Promise<UserAppEntitlement> {
      const app = await apps.findAppBySlug(slug);
      if (!app) {
        throw new Error(`App '${slug}' not found`);
      }

      const user = await users.findById(userId);
      if (!user) {
        throw new Error(`User '${userId}' not found`);
      }

      const sub = await apps.findActiveUserSubscription(userId, app.id);

      if (!sub) {
        return {
          app: {
            id: app.id,
            slug: app.slug,
            name: app.name,
            type: app.type,
          },
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          isPaid: false,
          hasActiveSubscription: false,
          status: "NO_SUBSCRIPTION",
          subscription: null,
          unlockedFeatures: [],
        };
      }

      const plan = await apps.findPlanById(sub.planId);
      const isLifetime = sub.endsAt === null;
      let daysRemaining = 0;
      if (sub.endsAt) {
        const diffMs = sub.endsAt.getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      } else {
        daysRemaining = 99999;
      }

      return {
        app: {
          id: app.id,
          slug: app.slug,
          name: app.name,
          type: app.type,
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        isPaid: true,
        hasActiveSubscription: true,
        status: sub.status,
        subscription: {
          id: sub.id,
          planId: sub.planId,
          planName: plan?.name ?? sub.planName ?? "Subscription Plan",
          interval: plan?.interval ?? "MONTH",
          startsAt: sub.startsAt,
          endsAt: sub.endsAt,
          daysRemaining,
          isLifetime,
        },
        unlockedFeatures: plan ? plan.featureKeys : [],
      };
    },

    async adminListAppConfig(slug: string) {
      const app = await apps.findAppBySlug(slug);
      if (!app) {
        throw new Error(`App '${slug}' not found`);
      }
      const [plans, menus, features] = await Promise.all([
        apps.listPlansForApp(app.id, false),
        apps.listMenuItemsForApp(app.id),
        apps.listFeatures(),
      ]);
      return { app, plans, menus, features };
    },

    async adminCreateApp(data) {
      return apps.createApp(data);
    },    async adminCreatePlan(data) {
      return apps.createPlan(data);
    },

    async adminCreateMenuItem(data) {
      return apps.createMenuItem(data);
    },

    async adminGrantSubscription(data) {
      const app = await apps.findAppBySlug(data.appSlug);
      if (!app) {
        throw new Error(`App '${data.appSlug}' not found`);
      }
      const plan = await apps.findPlanById(data.planId);
      if (!plan) {
        throw new Error(`Plan '${data.planId}' not found`);
      }

      const days = data.durationDays ?? plan.durationDays;
      const startsAt = new Date();
      const endsAt = days > 0 ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null;

      return apps.grantSubscription({
        userId: data.userId,
        appId: app.id,
        planId: plan.id,
        startsAt,
        endsAt,
      });
    },
  };
}
