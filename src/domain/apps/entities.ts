export type AppType =
  | "WEB_APP"
  | "DESKTOP_TOOL"
  | "MOBILE_APP"
  | "EMBED_WIDGET"
  | "MCP_SERVER";

export type AppStatus = "ACTIVE" | "INACTIVE";
export type MenuAccess = "FREE" | "PAID";
export type SubscriptionInterval = "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";
export type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELED" | "PENDING";

export interface AppRecord {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  type: AppType;
  status: AppStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeatureRecord {
  id: string;
  key: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export interface SubscriptionPlanRecord {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  currency: string;
  price: number;
  interval: SubscriptionInterval;
  durationDays: number;
  isActive: boolean;
  featureKeys: string[];
  features?: Array<{
    key: string;
    name: string;
    description: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppMenuItemRecord {
  id: string;
  appId: string;
  parentId: string | null;
  label: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  access: MenuAccess;
  requiredFeatureId: string | null;
  requiredFeatureKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSubscriptionRecord {
  id: string;
  userId: string;
  appId: string;
  planId: string;
  planName?: string;
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt: Date | null;
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EvaluatedMenuItem {
  id: string;
  label: string;
  path: string | null;
  icon: string | null;
  access: MenuAccess;
  requiredFeature: string | null;
  isAccessible: boolean;
  isLocked: boolean;
  lockReason?: "REQUIRE_SUBSCRIPTION" | "REQUIRE_FEATURE" | null;
  children: EvaluatedMenuItem[];
}

export interface UserAppEntitlement {
  app: {
    id: string;
    slug: string;
    name: string;
    type: AppType;
  };
  user: {
    id: string;
    email: string | null;
    name: string | null;
  };
  isPaid: boolean;
  hasActiveSubscription: boolean;
  status: SubscriptionStatus | "NO_SUBSCRIPTION";
  subscription: {
    id: string;
    planId: string;
    planName: string;
    interval: SubscriptionInterval;
    startsAt: Date;
    endsAt: Date | null;
    daysRemaining: number;
    isLifetime: boolean;
  } | null;
  unlockedFeatures: string[];
  hasFeature?: boolean;
  checkedFeature?: string | null;
}

export interface AppRepository {
  listActiveApps(): Promise<AppRecord[]>;
  findAppBySlug(slug: string): Promise<AppRecord | null>;
  findAppById(id: string): Promise<AppRecord | null>;
  createApp(data: {
    slug: string;
    name: string;
    description?: string | null;
    type?: AppType;
    status?: AppStatus;
  }): Promise<AppRecord>;

  listPlansForApp(appId: string, onlyActive?: boolean): Promise<SubscriptionPlanRecord[]>;
  findPlanById(id: string): Promise<SubscriptionPlanRecord | null>;
  createPlan(data: {
    appId: string;
    name: string;
    description?: string | null;
    currency?: string;
    price: number;
    interval?: SubscriptionInterval;
    durationDays?: number;
    featureKeys?: string[];
  }): Promise<SubscriptionPlanRecord>;

  listMenuItemsForApp(appId: string): Promise<AppMenuItemRecord[]>;
  createMenuItem(data: {
    appId: string;
    parentId?: string | null;
    label: string;
    path?: string | null;
    icon?: string | null;
    sortOrder?: number;
    access?: MenuAccess;
    requiredFeatureKey?: string | null;
  }): Promise<AppMenuItemRecord>;

  findActiveUserSubscription(userId: string, appId: string): Promise<UserSubscriptionRecord | null>;
  listUserSubscriptions(userId: string): Promise<UserSubscriptionRecord[]>;
  grantSubscription(data: {
    userId: string;
    appId: string;
    planId: string;
    startsAt: Date;
    endsAt: Date | null;
    orderId?: string | null;
  }): Promise<UserSubscriptionRecord>;

  listFeatures(): Promise<FeatureRecord[]>;
  findOrCreateFeature(key: string, name: string, description?: string): Promise<FeatureRecord>;
}
