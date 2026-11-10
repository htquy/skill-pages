import type { PrismaClient } from "@prisma/client";
import { SKILLSTUDIO_PAGE } from "./product-pages";

/**
 * SkillStudio (desktop, NativeAOT) — app slug "skill-studio", OAuth client "skill-studio-desktop".
 *
 * Mã tính năng phải khớp `LicenseFeatures` trong VideoToolSkill/SkillStudio
 * (src/SkillStudio.Jobs/Licensing/LicenseFeatures.cs). Duyệt thư viện, phong cách miễn phí, job theo mô tả tự do,
 * chẩn đoán và cài đặt là miễn phí nên không có feature.
 *
 * Giá dưới đây áp cho DB mới; DB đã có giá thì chỉnh ở /admin/apps hoặc chạy scripts/set-skillstudio-prices.ts (upsert không ghi đè giá đã có).
 */
export const SKILLSTUDIO_FEATURES = [
  { key: "SS_PRO_STYLES", name: "Phong cách Pro", description: "Toàn bộ phong cách trả phí cho Web, Image và Slides." },
  { key: "SS_VIDEO_STUDIO", name: "Video Studio", description: "Phong cách video & motion: launch film, reel, kinetic type." },
  { key: "SS_ITERATE", name: "Chỉnh sửa tiếp & fork", description: "Tinh chỉnh kết quả trong cùng phiên agent và fork phiên bản." },
] as const;

/** Bảng giá gói Pro (VND). Muốn áp vào DB đã có: scripts/set-skillstudio-prices.ts (seed không ghi đè giá đã tồn tại). */
export const SKILLSTUDIO_PRO_PRICES = [
  { months: 1, amount: 199000 },
  { months: 6, amount: 999000 },
  { months: 12, amount: 1599000 },
];

export async function seedSkillStudio(prisma: PrismaClient, demoUserId?: string) {
  // OAuth public client (PKCE). Loopback redirect với cổng ngẫu nhiên được chấp nhận theo RFC 8252 §7.3.
  await prisma.oAuthClient.upsert({
    where: { clientId: "skill-studio-desktop" },
    create: {
      id: "client-skill-studio-desktop",
      name: "SkillStudio Desktop (NativeAOT)",
      clientId: "skill-studio-desktop",
      clientSecretHash: null,
      redirectUris: ["http://127.0.0.1/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
    update: {
      name: "SkillStudio Desktop (NativeAOT)",
      redirectUris: ["http://127.0.0.1/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
  });

  const description = "Xưởng sáng tạo Web / Image / Video / Slides bằng AI agent CLI (NativeAOT + WebView2)";
  const app = await prisma.app.upsert({
    where: { slug: "skill-studio" },
    create: { id: "app-skill-studio", slug: "skill-studio", name: "SkillStudio", description, type: "DESKTOP_TOOL", status: "ACTIVE" },
    update: { name: "SkillStudio", description, type: "DESKTOP_TOOL", status: "ACTIVE" },
  });

  const features = [];
  for (const f of SKILLSTUDIO_FEATURES) {
    features.push(
      await prisma.feature.upsert({
        where: { key: f.key },
        create: { id: `feat-${f.key.toLowerCase()}`, ...f },
        update: { name: f.name, description: f.description },
      }),
    );
  }

  const pro = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-skillstudio-pro" },
    create: {
      id: "plan-skillstudio-pro",
      appId: app.id,
      name: "Pro",
      description: "Mở toàn bộ phong cách Pro, Video Studio và vòng chỉnh sửa / fork.",
      sortOrder: 1,
      isActive: true,
    },
    update: { appId: app.id, isActive: true },
  });
  for (const feature of features) {
    await prisma.planFeature.upsert({
      where: { planId_featureId: { planId: pro.id, featureId: feature.id } },
      create: { planId: pro.id, featureId: feature.id },
      update: {},
    });
  }
  for (const price of SKILLSTUDIO_PRO_PRICES) {
    await prisma.subscriptionPlanPrice.upsert({
      where: { planId_months_currency: { planId: pro.id, months: price.months, currency: "VND" } },
      create: { planId: pro.id, months: price.months, currency: "VND", amount: price.amount },
      update: {},
    });
  }

  // Menu = vùng chức năng của app (path = route trong UI SkillStudio).
  const byKey = new Map(features.map((f) => [f.key, f.id]));
  const menus = [
    { id: "menu-ss-gallery", label: "Thư viện phong cách", path: "gallery", sortOrder: 1, feature: null },
    { id: "menu-ss-free", label: "Phong cách miễn phí & mô tả tự do", path: "new", sortOrder: 2, feature: null },
    { id: "menu-ss-pro", label: "Phong cách Pro (Web · Image · Slides)", path: "new/pro", sortOrder: 3, feature: "SS_PRO_STYLES" },
    { id: "menu-ss-video", label: "Video Studio", path: "new/video", sortOrder: 4, feature: "SS_VIDEO_STUDIO" },
    { id: "menu-ss-iterate", label: "Chỉnh sửa tiếp & fork", path: "job/refine", sortOrder: 5, feature: "SS_ITERATE" },
    { id: "menu-ss-history", label: "Lịch sử", path: "history", sortOrder: 6, feature: null },
    { id: "menu-ss-settings", label: "Cài đặt & tài khoản", path: "settings", sortOrder: 7, feature: null },
  ];
  await prisma.appMenuItem.deleteMany({ where: { appId: app.id, id: { notIn: menus.map((m) => m.id) } } });
  for (const m of menus) {
    const data = {
      appId: app.id,
      label: m.label,
      path: m.path,
      sortOrder: m.sortOrder,
      access: m.feature ? ("PAID" as const) : ("FREE" as const),
      requiredFeatureId: m.feature ? byKey.get(m.feature)! : null,
    };
    await prisma.appMenuItem.upsert({ where: { id: m.id }, create: { id: m.id, ...data }, update: data });
  }

  if (demoUserId) {
    const endsAt = new Date();
    endsAt.setUTCMonth(endsAt.getUTCMonth() + 12);
    await prisma.userSubscription.upsert({
      where: { id: "sub-skillstudio-demo-year" },
      create: { id: "sub-skillstudio-demo-year", userId: demoUserId, appId: app.id, planId: pro.id, status: "ACTIVE", startsAt: new Date(), endsAt },
      update: { planId: pro.id, status: "ACTIVE", endsAt },
    });
  }

  // Trang giới thiệu /tools/skillstudio. Media (video/ảnh bìa) do scripts/publish-product-pages.ts gắn sau khi upload R2.
  const page = SKILLSTUDIO_PAGE;
  await prisma.tool.upsert({
    where: { slug: page.slug },
    create: {
      slug: page.slug,
      title: page.title,
      shortDescription: page.shortDescription,
      description: page.description,
      type: "DOWNLOADABLE",
      billingType: "SUBSCRIPTION",
      status: "PUBLISHED",
      publishedAt: new Date(),
      appSlug: app.slug,
    },
    update: {
      title: page.title,
      shortDescription: page.shortDescription,
      description: page.description,
      appSlug: app.slug,
    },
  });

  return app;
}
