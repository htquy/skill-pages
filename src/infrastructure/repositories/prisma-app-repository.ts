import { Prisma } from "@prisma/client";
import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  AppRepository,
  AppRecord,
  AppMenuItemRecord,
  SubscriptionPlanRecord,
  UserSubscriptionRecord,
  FeatureRecord,
  AppType,
  AppStatus,
  MenuAccess,
  PlanPriceRecord,
  SubscriptionStatus,
} from "@/src/domain/apps/entities";

import type {
  App as PrismaApp,
  SubscriptionPlan as PrismaPlan,
  AppMenuItem as PrismaMenuItem,
  Feature as PrismaFeature,
  UserSubscription as PrismaUserSub,
  SubscriptionPlanPrice as PrismaPlanPrice,
} from "@prisma/client";

type PlanWithFeatures = PrismaPlan & {
  features?: Array<{
    feature?: PrismaFeature | null;
  }>;
  prices?: PrismaPlanPrice[];
};

const planInclude = {
  features: { include: { feature: true } },
  prices: { orderBy: [{ months: "asc" as const }, { amount: "asc" as const }] },
};

function mapPrice(row: PrismaPlanPrice): PlanPriceRecord {
  return {
    id: row.id,
    planId: row.planId,
    months: row.months,
    currency: row.currency,
    amount: row.amount,
    isActive: row.isActive,
  };
}

function mapSubscription(sub: PrismaUserSub & { plan: PrismaPlan }): UserSubscriptionRecord {
  return {
    id: sub.id,
    userId: sub.userId,
    appId: sub.appId,
    planId: sub.planId,
    planName: sub.plan.name,
    status: sub.status as SubscriptionStatus,
    startsAt: sub.startsAt,
    endsAt: sub.endsAt,
    orderId: sub.orderId,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  };
}

async function setPlanFeatures(planId: string, featureKeys: string[]) {
  await prisma.planFeature.deleteMany({ where: { planId } });
  for (const key of [...new Set(featureKeys)]) {
    const feat = await prisma.feature.upsert({ where: { key }, create: { key, name: key }, update: {} });
    await prisma.planFeature.create({ data: { planId, featureId: feat.id } });
  }
}

type MenuItemWithFeature = PrismaMenuItem & {
  requiredFeature?: PrismaFeature | null;
};

function mapApp(row: PrismaApp): AppRecord {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    type: row.type as AppType,
    status: row.status as AppStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapPlan(row: PlanWithFeatures): SubscriptionPlanRecord {
  const featureList = row.features
    ? row.features
        .map((pf) => pf.feature)
        .filter((f): f is PrismaFeature => !!f)
        .map((f) => ({ key: f.key, name: f.name, description: f.description }))
    : [];
  const featureKeys = featureList.map((f) => f.key);
  return {
    id: row.id,
    appId: row.appId,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    isActive: row.isActive,
    featureKeys,
    features: featureList,
    prices: (row.prices ?? []).map(mapPrice),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapMenuItem(row: MenuItemWithFeature): AppMenuItemRecord {
  return {
    id: row.id,
    appId: row.appId,
    parentId: row.parentId,
    label: row.label,
    path: row.path,
    icon: row.icon,
    sortOrder: row.sortOrder,
    access: row.access as MenuAccess,
    requiredFeatureId: row.requiredFeatureId,
    requiredFeatureKey: row.requiredFeature?.key ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const prismaAppRepository: AppRepository = {
  async listActiveApps(): Promise<AppRecord[]> {
    const list = await prisma.app.findMany({
      where: { status: "ACTIVE" },
      orderBy: { name: "asc" },
    });
    return list.map(mapApp);
  },

  async findAppBySlug(slug: string): Promise<AppRecord | null> {
    const app = await prisma.app.findUnique({
      where: { slug },
    });
    return app ? mapApp(app) : null;
  },

  async findAppById(id: string): Promise<AppRecord | null> {
    const app = await prisma.app.findUnique({
      where: { id },
    });
    return app ? mapApp(app) : null;
  },

  async createApp(data): Promise<AppRecord> {
    const app = await prisma.app.create({
      data: {
        slug: data.slug,
        name: data.name,
        description: data.description ?? null,
        type: data.type ?? "WEB_APP",
        status: data.status ?? "ACTIVE",
      },
    });
    return mapApp(app);
  },

  async listPlansForApp(appId: string, onlyActive: boolean = true): Promise<SubscriptionPlanRecord[]> {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { appId, ...(onlyActive ? { isActive: true } : {}) },
      include: planInclude,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return plans.map((plan) => {
      const mapped = mapPlan(plan);
      return onlyActive ? { ...mapped, prices: mapped.prices.filter((p) => p.isActive) } : mapped;
    });
  },

  async findPlanById(id: string): Promise<SubscriptionPlanRecord | null> {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id }, include: planInclude });
    return plan ? mapPlan(plan) : null;
  },

  async createPlan(data): Promise<SubscriptionPlanRecord> {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        appId: data.appId,
        name: data.name,
        description: data.description ?? null,
        sortOrder: data.sortOrder ?? 0,
        isActive: true,
        prices: data.prices?.length
          ? { create: data.prices.map((p) => ({ months: p.months, amount: p.amount, currency: p.currency ?? "VND" })) }
          : undefined,
      },
    });
    if (data.featureKeys?.length) await setPlanFeatures(plan.id, data.featureKeys);
    return (await this.findPlanById(plan.id))!;
  },

  async updatePlan(id, data): Promise<SubscriptionPlanRecord> {
    await prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    });
    if (data.featureKeys) await setPlanFeatures(id, data.featureKeys);
    return (await this.findPlanById(id))!;
  },

  async upsertPlanPrice(planId, data): Promise<PlanPriceRecord> {
    const currency = data.currency ?? "VND";
    const row = await prisma.subscriptionPlanPrice.upsert({
      where: { planId_months_currency: { planId, months: data.months, currency } },
      create: { planId, months: data.months, currency, amount: data.amount, isActive: data.isActive ?? true },
      update: { amount: data.amount, isActive: data.isActive ?? true },
    });
    return mapPrice(row);
  },

  async findPlanPriceById(id) {
    const row = await prisma.subscriptionPlanPrice.findUnique({
      where: { id },
      include: { plan: { include: planInclude } },
    });
    return row ? { ...mapPrice(row), plan: mapPlan(row.plan) } : null;
  },

  async listMenuItemsForApp(appId: string): Promise<AppMenuItemRecord[]> {
    const items = await prisma.appMenuItem.findMany({
      where: { appId },
      include: {
        requiredFeature: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return items.map(mapMenuItem);
  },

  async createMenuItem(data): Promise<AppMenuItemRecord> {
    let featureId: string | null = null;
    if (data.requiredFeatureKey) {
      const feat = await prisma.feature.upsert({
        where: { key: data.requiredFeatureKey },
        create: { key: data.requiredFeatureKey, name: data.requiredFeatureKey },
        update: {},
      });
      featureId = feat.id;
    }

    const item = await prisma.appMenuItem.create({
      data: {
        appId: data.appId,
        parentId: data.parentId ?? null,
        label: data.label,
        path: data.path ?? null,
        icon: data.icon ?? null,
        sortOrder: data.sortOrder ?? 0,
        access: data.access ?? "FREE",
        requiredFeatureId: featureId,
      },
      include: {
        requiredFeature: true,
      },
    });
    return mapMenuItem(item);
  },

  async listCurrentUserSubscriptions(userId, appId, now): Promise<UserSubscriptionRecord[]> {
    const list = await prisma.userSubscription.findMany({
      where: {
        userId,
        appId,
        status: "ACTIVE",
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: { plan: true },
      orderBy: { startsAt: "asc" },
    });
    return list.map(mapSubscription);
  },

  async listUnexpiredUserSubscriptions(userId, appId, now): Promise<UserSubscriptionRecord[]> {
    const list = await prisma.userSubscription.findMany({
      where: { userId, appId, status: "ACTIVE", OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
      include: { plan: true },
      orderBy: { startsAt: "asc" },
    });
    return list.map(mapSubscription);
  },

  async findSubscriptionByOrderId(orderId: string): Promise<UserSubscriptionRecord | null> {
    const sub = await prisma.userSubscription.findUnique({ where: { orderId }, include: { plan: true } });
    return sub ? mapSubscription(sub) : null;
  },

  async cancelSubscriptionByOrderId(orderId: string): Promise<void> {
    await prisma.userSubscription.updateMany({ where: { orderId }, data: { status: "CANCELED" } });
  },

  async listUserSubscriptions(userId: string): Promise<UserSubscriptionRecord[]> {
    const list = await prisma.userSubscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return list.map(mapSubscription);
  },

  async grantSubscription(data): Promise<UserSubscriptionRecord> {
    try {
      const sub = await prisma.userSubscription.create({
        data: {
          userId: data.userId,
          appId: data.appId,
          planId: data.planId,
          status: "ACTIVE",
          startsAt: data.startsAt,
          endsAt: data.endsAt,
          orderId: data.orderId ?? null,
        },
        include: { plan: true },
      });
      return mapSubscription(sub);
    } catch (error) {
      // Cùng đơn hàng được xử lý hai lần (webhook gửi lặp, hai request song song): trả kỳ đã tạo.
      if (data.orderId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.userSubscription.findUnique({ where: { orderId: data.orderId }, include: { plan: true } });
        if (existing) return mapSubscription(existing);
      }
      throw error;
    }
  },

  async listFeatures(): Promise<FeatureRecord[]> {
    const list = await prisma.feature.findMany({
      orderBy: { key: "asc" },
    });
    return list.map((f: PrismaFeature) => ({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
      createdAt: f.createdAt,
    }));
  },

  async findOrCreateFeature(key: string, name: string, description?: string): Promise<FeatureRecord> {
    const f = await prisma.feature.upsert({
      where: { key },
      create: { key, name, description: description ?? null },
      update: { name, description: description ?? null },
    });
    return {
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description,
      createdAt: f.createdAt,
    };
  },
};
