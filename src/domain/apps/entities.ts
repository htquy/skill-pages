export type AppType =
  | "WEB_APP"
  | "DESKTOP_TOOL"
  | "MOBILE_APP"
  | "EMBED_WIDGET"
  | "MCP_SERVER";

export type AppStatus = "ACTIVE" | "INACTIVE";
export type MenuAccess = "FREE" | "PAID";
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

/** Một kỳ hạn bán của gói: số tháng lịch (0 = vĩnh viễn) và giá ở đơn vị nhỏ nhất. */
export interface PlanPriceRecord {
  id: string;
  planId: string;
  months: number;
  currency: string;
  amount: number;
  isActive: boolean;
}

/** Gói = tầng tính năng; bán theo nhiều kỳ hạn qua `prices`. */
export interface SubscriptionPlanRecord {
  id: string;
  appId: string;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  featureKeys: string[];
  features?: Array<{
    key: string;
    name: string;
    description: string | null;
  }>;
  prices: PlanPriceRecord[];
  createdAt: Date;
  updatedAt: Date;
}

/** Thông tin đủ để tạo đơn mua một kỳ hạn (facade cho module orders, không join chéo). */
export interface PurchasablePlanPrice {
  priceId: string;
  months: number;
  amount: number;
  currency: string;
  planId: string;
  planName: string;
  appId: string;
  appSlug: string;
  appName: string;
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
    startsAt: Date;
    /** Ngày hết hạn cuối cùng tính cả các kỳ đã mua nối tiếp; null = vĩnh viễn. */
    endsAt: Date | null;
    daysRemaining: number;
    isLifetime: boolean;
  } | null;
  /** Giờ máy chủ, để client phát hiện đồng hồ máy bị chỉnh khi dùng kết quả cache offline. */
  serverTime: Date;
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
    sortOrder?: number;
    featureKeys?: string[];
    prices?: Array<{ months: number; amount: number; currency?: string }>;
  }): Promise<SubscriptionPlanRecord>;
  updatePlan(id: string, data: {
    name?: string;
    description?: string | null;
    sortOrder?: number;
    isActive?: boolean;
    featureKeys?: string[];
  }): Promise<SubscriptionPlanRecord>;
  /** Thêm hoặc sửa giá của một kỳ hạn (khóa: plan + months + currency). */
  upsertPlanPrice(planId: string, data: { months: number; amount: number; currency?: string; isActive?: boolean }): Promise<PlanPriceRecord>;
  findPlanPriceById(id: string): Promise<(PlanPriceRecord & { plan: SubscriptionPlanRecord }) | null>;

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

  /** Các kỳ đang có hiệu lực tại `now` (startsAt <= now < endsAt hoặc vĩnh viễn). */
  listCurrentUserSubscriptions(userId: string, appId: string, now: Date): Promise<UserSubscriptionRecord[]>;
  /** Mọi kỳ ACTIVE chưa hết hạn (gồm cả kỳ mua nối tiếp chưa bắt đầu). */
  listUnexpiredUserSubscriptions(userId: string, appId: string, now: Date): Promise<UserSubscriptionRecord[]>;
  findSubscriptionByOrderId(orderId: string): Promise<UserSubscriptionRecord | null>;
  /** Đặt CANCELED cho kỳ do đơn này tạo ra (hoàn tiền). */
  cancelSubscriptionByOrderId(orderId: string): Promise<void>;
  listUserSubscriptions(userId: string): Promise<UserSubscriptionRecord[]>;
  /** Tạo một kỳ đăng ký. Trùng `orderId` => trả kỳ đã có (idempotent). */
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
