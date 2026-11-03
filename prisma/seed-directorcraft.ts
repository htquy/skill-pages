import type { PrismaClient } from "@prisma/client";

/**
 * DirectorCraft Studio (slug giữ "video-tool" vì client + manifest cập nhật đã dùng slug này).
 *
 * Mã tính năng phải khớp `LicenseFeatures` trong DirectorCraft.NativeAOT
 * (VideoTool.NavtiveAOT/Services/Licensing/LicenseFeatures.cs). Công cụ hậu kỳ, Thư viện,
 * cấu hình Agent và Tài khoản là miễn phí nên không có feature.
 *
 * Giá dưới đây là giá mẫu — chỉnh ở /admin/apps, không cần sửa code.
 */
export const DIRECTORCRAFT_FEATURES = [
  { key: "DC_CINEMA_2D", name: "Cinema 2D", description: "Agent làm phim 2D: lên kịch bản, tìm tư liệu, dựng và render." },
  { key: "DC_MOTION_2D", name: "Motion Studio 2D", description: "Dựng motion graphic theo mẫu, có agent viết spec." },
  { key: "DC_AUTOCLIP", name: "Auto-Clip Shorts", description: "Tự cắt video dài thành shorts." },
] as const;

const PRO_PRICES = [
  { months: 1, amount: 199000 },
  { months: 6, amount: 990000 },
  { months: 12, amount: 1690000 },
];

export async function seedDirectorCraft(prisma: PrismaClient, demoUserId?: string) {
  const app = await prisma.app.upsert({
    where: { slug: "video-tool" },
    create: {
      id: "app-video-tool",
      slug: "video-tool",
      name: "DirectorCraft Studio",
      description: "Xưởng làm phim & motion 2D bằng AI agent (NativeAOT + Avalonia)",
      type: "DESKTOP_TOOL",
      status: "ACTIVE",
    },
    update: {
      name: "DirectorCraft Studio",
      description: "Xưởng làm phim & motion 2D bằng AI agent (NativeAOT + Avalonia)",
      type: "DESKTOP_TOOL",
      status: "ACTIVE",
    },
  });

  const features = [];
  for (const f of DIRECTORCRAFT_FEATURES) {
    features.push(
      await prisma.feature.upsert({
        where: { key: f.key },
        create: { id: `feat-${f.key.toLowerCase()}`, ...f },
        update: { name: f.name, description: f.description },
      }),
    );
  }

  // Gói cũ (1 tháng / 1 năm theo tính năng batch/GPU/watermark) không còn khớp app: ngừng bán, giữ lịch sử.
  await prisma.subscriptionPlan.updateMany({
    where: { id: { in: ["plan-video-month", "plan-video-year"] } },
    data: { isActive: false },
  });
  // Người đã mua gói cũ vẫn còn hạn phải dùng được app mới (xem migration legacy_video_plans_unlock_directorcraft).
  const legacyPlans = await prisma.subscriptionPlan.findMany({
    where: { id: { in: ["plan-video-month", "plan-video-year"] } },
    select: { id: true },
  });
  for (const plan of legacyPlans) {
    for (const feature of features) {
      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId: plan.id, featureId: feature.id } },
        create: { planId: plan.id, featureId: feature.id },
        update: {},
      });
    }
  }

  const pro = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-directorcraft-pro" },
    create: {
      id: "plan-directorcraft-pro",
      appId: app.id,
      name: "Pro",
      description: "Mở toàn bộ Cinema 2D, Motion Studio 2D và Auto-Clip.",
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
  for (const price of PRO_PRICES) {
    await prisma.subscriptionPlanPrice.upsert({
      where: { planId_months_currency: { planId: pro.id, months: price.months, currency: "VND" } },
      create: { planId: pro.id, months: price.months, currency: "VND", amount: price.amount },
      update: {},
    });
  }

  // Menu khớp thanh điều hướng của app (path = tag điều hướng trong MainWindowViewModel).
  const byKey = new Map(features.map((f) => [f.key, f.id]));
  const menus = [
    { id: "menu-dc-cinema", label: "Cinema 2D", path: "AgentFilm", sortOrder: 1, feature: "DC_CINEMA_2D" },
    { id: "menu-dc-motion", label: "Motion Studio 2D", path: "MotionStudio", sortOrder: 2, feature: "DC_MOTION_2D" },
    { id: "menu-dc-library", label: "Thư viện", path: "Library", sortOrder: 3, feature: null },
    { id: "menu-dc-agents", label: "Agent", path: "Agents", sortOrder: 4, feature: null },
    { id: "menu-dc-autoclip", label: "Auto-Clip Shorts", path: "AutoClip", sortOrder: 5, feature: "DC_AUTOCLIP" },
    { id: "menu-dc-tools", label: "Công cụ hậu kỳ", path: "Tools", sortOrder: 6, feature: null },
    { id: "menu-dc-account", label: "Tài khoản", path: "Account", sortOrder: 7, feature: null },
  ];
  // Menu mẫu cũ (batch/GPU/watermark...) không còn tương ứng màn hình nào.
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
      where: { id: "sub-video-demo-year" },
      create: { id: "sub-video-demo-year", userId: demoUserId, appId: app.id, planId: pro.id, status: "ACTIVE", startsAt: new Date(), endsAt },
      update: { planId: pro.id, status: "ACTIVE", endsAt },
    });
  }
  // Trang giới thiệu ở /tools liên kết với app: lối vào để khách tìm tới bảng giá /apps/video-tool/pricing.
  await prisma.tool.upsert({
    where: { slug: "directorcraft-studio" },
    create: {
      slug: "directorcraft-studio",
      title: app.name,
      shortDescription: app.description ?? app.name,
      description: `<p>${app.description ?? app.name}</p>`,
      type: "DOWNLOADABLE",
      billingType: "SUBSCRIPTION",
      status: "PUBLISHED",
      publishedAt: new Date(),
      appSlug: app.slug,
    },
    update: { appSlug: app.slug },
  });

  return app;
}
