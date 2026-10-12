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
  SubscriptionInterval,
  SubscriptionStatus,
} from "@/src/domain/apps/entities";

import type {
  App as PrismaApp,
  SubscriptionPlan as PrismaPlan,
  AppMenuItem as PrismaMenuItem,
  Feature as PrismaFeature,
  UserSubscription as PrismaUserSub,
} from "@prisma/client";

type PlanWithFeatures = PrismaPlan & {
  features?: Array<{
    feature?: PrismaFeature | null;
  }>;
};

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
    currency: row.currency,
    price: row.price,
    interval: row.interval as SubscriptionInterval,
    durationDays: row.durationDays,
    isActive: row.isActive,
    featureKeys,
    features: featureList,
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
      where: {
        appId,
        ...(onlyActive ? { isActive: true } : {}),
      },
      include: {
        features: {
          include: { feature: true },
        },
      },
      orderBy: { price: "asc" },
    });
    return plans.map(mapPlan);
  },

  async findPlanById(id: string): Promise<SubscriptionPlanRecord | null> {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id },
      include: {
        features: {
          include: { feature: true },
        },
      },
    });
    return plan ? mapPlan(plan) : null;
  },

  async createPlan(data): Promise<SubscriptionPlanRecord> {
    const plan = await prisma.subscriptionPlan.create({
      data: {
        appId: data.appId,
        name: data.name,
        description: data.description ?? null,
        currency: data.currency ?? "VND",
        price: data.price,
        interval: data.interval ?? "MONTH",
        durationDays: data.durationDays ?? 30,
        isActive: true,
      },
    });

    if (data.featureKeys && data.featureKeys.length > 0) {
      for (const key of data.featureKeys) {
        const feat = await prisma.feature.upsert({
          where: { key },
          create: { key, name: key },
          update: {},
        });
        await prisma.planFeature.create({
          data: {
            planId: plan.id,
            featureId: feat.id,
          },
        });
      }
    }

    return (await this.findPlanById(plan.id))!;
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

  async findActiveUserSubscription(userId: string, appId: string): Promise<UserSubscriptionRecord | null> {
    const now = new Date();
    const sub = await prisma.userSubscription.findFirst({
      where: {
        userId,
        appId,
        status: "ACTIVE",
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      include: {
        plan: true,
      },
      orderBy: { endsAt: "desc" },
    });

    if (!sub) return null;

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
  },

  async listUserSubscriptions(userId: string): Promise<UserSubscriptionRecord[]> {
    const list = await prisma.userSubscription.findMany({
      where: { userId },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
    });
    return list.map((sub: PrismaUserSub & { plan: PrismaPlan }) => ({
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
    }));
  },

  async grantSubscription(data): Promise<UserSubscriptionRecord> {
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
