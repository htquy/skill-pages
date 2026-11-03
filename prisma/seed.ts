

import { seedDirectorCraft } from "./seed-directorcraft";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  const shouldClean = process.argv.includes("--clean");

  if (shouldClean) {
    console.log("Cleaning existing data (--clean flag specified)…");
    await prisma.toolClick.deleteMany();
    await prisma.skillView.deleteMany();
    await prisma.skillFavorite.deleteMany();
    await prisma.rankingEntry.deleteMany();
    await prisma.ranking.deleteMany();
    await prisma.newsToolLink.deleteMany();
    await prisma.newsArticle.deleteMany();
    await prisma.newsCategory.deleteMany();
    await prisma.skillPrice.deleteMany();
    await prisma.skillVersion.deleteMany();
    await prisma.skillToolLink.deleteMany();
    await prisma.skillUseCaseLink.deleteMany();
    await prisma.skillIndustryLink.deleteMany();
    await prisma.skillCategoryLink.deleteMany();
    await prisma.skill.deleteMany();
    await prisma.toolPrice.deleteMany();
    await prisma.toolVersion.deleteMany();
    await prisma.tool.deleteMany();
    await prisma.aITool.deleteMany();
    await prisma.useCase.deleteMany();
    await prisma.skillCategory.deleteMany();
    await prisma.industry.deleteMany();
    await prisma.userSubscription.deleteMany();
    await prisma.planFeature.deleteMany();
    await prisma.subscriptionPlan.deleteMany();
    await prisma.appMenuItem.deleteMany();
    await prisma.app.deleteMany();
    await prisma.feature.deleteMany();
    await prisma.oAuthRefreshToken.deleteMany();
    await prisma.oAuthAccessToken.deleteMany();
    await prisma.authorizationCode.deleteMany();
    await prisma.oAuthClient.deleteMany();
    await prisma.session.deleteMany();
    await prisma.account.deleteMany();
    await prisma.user.deleteMany();
  } else {
    console.log("Chế độ: INSERT / UPDATE (UPSERT) an toàn trên DB thực local…");
  }

  // ---------------------------------------------------------------------------
  // 1. Users (UPSERT)
  // ---------------------------------------------------------------------------
  const adminId = "user-admin-0001";
  const demoId = "user-demo-0001";

  await prisma.user.upsert({
    where: { id: adminId },
    create: {
      id: adminId,
      name: "Platform Admin",
      email: "admin@promptworks.app",
      role: "ADMIN",
    },
    update: {
      name: "Platform Admin",
      email: "admin@promptworks.app",
      role: "ADMIN",
    },
  });

  await prisma.user.upsert({
    where: { id: demoId },
    create: {
      id: demoId,
      name: "Demo Explorer",
      email: "explorer@promptworks.app",
      role: "CUSTOMER",
    },
    update: {
      name: "Demo Explorer",
      email: "explorer@promptworks.app",
      role: "CUSTOMER",
    },
  });
  console.log("✔ Users upserted (Admin & Demo)");

  // ---------------------------------------------------------------------------
  // 2. Taxonomy (UPSERT)
  // ---------------------------------------------------------------------------
  const industries = [
    { slug: "marketing", name: "Marketing" },
    { slug: "sales", name: "Sales" },
    { slug: "engineering", name: "Engineering" },
    { slug: "product", name: "Product" },
    { slug: "design", name: "Design" },
    { slug: "operations", name: "Operations" },
  ];
  for (const item of industries) {
    await prisma.industry.upsert({
      where: { slug: item.slug },
      create: item,
      update: { name: item.name },
    });
  }

  const categories = [
    { slug: "prompt", name: "Prompt" },
    { slug: "workflow", name: "Workflow" },
    { slug: "skill", name: "Skill" },
    { slug: "template", name: "Template" },
  ];
  for (const item of categories) {
    await prisma.skillCategory.upsert({
      where: { slug: item.slug },
      create: item,
      update: { name: item.name },
    });
  }

  const useCases = [
    { slug: "content-generation", name: "Content generation" },
    { slug: "customer-support", name: "Customer support" },
    { slug: "code-review", name: "Code review" },
    { slug: "data-analysis", name: "Data analysis" },
    { slug: "ideation", name: "Ideation" },
    { slug: "document-writing", name: "Document writing" },
  ];
  for (const item of useCases) {
    await prisma.useCase.upsert({
      where: { slug: item.slug },
      create: item,
      update: { name: item.name },
    });
  }

  const tools = [
    {
      id: "chatgpt",
      slug: "chatgpt",
      name: "ChatGPT",
      description: "OpenAI's flagship conversational assistant.",
      websiteUrl: "https://chatgpt.com",
      logoUrl: null,
    },
    {
      id: "claude",
      slug: "claude",
      name: "Claude",
      description: "Anthropic's assistant for nuanced, long-form work.",
      websiteUrl: "https://claude.ai",
      logoUrl: null,
    },
    {
      id: "midjourney",
      slug: "midjourney",
      name: "Midjourney",
      description: "High-quality image generation from text prompts.",
      websiteUrl: "https://midjourney.com",
      logoUrl: null,
    },
    {
      id: "notebooklm",
      slug: "notebooklm",
      name: "NotebookLM",
      description: "Research assistant grounded in your own sources.",
      websiteUrl: "https://notebooklm.google.com",
      logoUrl: null,
    },
    {
      id: "copilot",
      slug: "copilot",
      name: "GitHub Copilot",
      description: "AI pair programmer that lives in your editor.",
      websiteUrl: "https://github.com/features/copilot",
      logoUrl: null,
    },
  ];
  for (const item of tools) {
    await prisma.aITool.upsert({
      where: { id: item.id },
      create: item,
      update: item,
    });
  }
  console.log("✔ Taxonomy & AI Tools upserted");

  // ---------------------------------------------------------------------------
  // 3. Downloadable Tools & Distributables (schema: catalog -> tools)
  // ---------------------------------------------------------------------------
  const desktopExeTool = await prisma.tool.upsert({
    where: { slug: "smart-money-desktop-win" },
    create: {
      id: "tool-smart-money-desktop",
      slug: "smart-money-desktop-win",
      title: "SmartMoney Desktop (Windows Installer)",
      shortDescription: "Phần mềm quản lý tài chính máy tính chạy trên Windows (EXE installer).",
      description: "Ứng dụng máy tính quản lý sổ quỹ, tra cứu giao dịch, báo cáo tài chính ngoại tuyến và đồng bộ hóa qua đám mây khi có kết nối mạng.",
      type: "DOWNLOADABLE",
      billingType: "SUBSCRIPTION",
      status: "PUBLISHED",
      config: {
        supportedOS: ["Windows 10", "Windows 11"],
        arch: ["x64", "arm64"],
      },
      publishedAt: daysAgo(5),
    },
    update: {
      title: "SmartMoney Desktop (Windows Installer)",
      status: "PUBLISHED",
    },
  });

  await prisma.toolPrice.upsert({
    where: { id: "tp-win-month" },
    create: {
      id: "tp-win-month",
      toolId: desktopExeTool.id,
      currency: "VND",
      amount: 99000,
      durationDays: 30,
      isActive: true,
    },
    update: { amount: 99000, durationDays: 30, isActive: true },
  });

  await prisma.toolPrice.upsert({
    where: { id: "tp-win-year" },
    create: {
      id: "tp-win-year",
      toolId: desktopExeTool.id,
      currency: "VND",
      amount: 890000,
      durationDays: 365,
      isActive: true,
    },
    update: { amount: 890000, durationDays: 365, isActive: true },
  });

  await prisma.toolVersion.upsert({
    where: {
      toolId_versionCode: {
        toolId: desktopExeTool.id,
        versionCode: "1.0.0",
      },
    },
    create: {
      id: "tv-win-100",
      toolId: desktopExeTool.id,
      versionCode: "1.0.0",
      fileName: "SmartMoney-Setup-1.0.0.exe",
      fileUrl: "https://pub-72586750bed84d87a484e63bbf7b87c0.r2.dev/builds/SmartMoney-Setup-1.0.0.exe",
      fileSize: BigInt(48500000),
      isLatest: true,
      changelog: "Phiên bản chính thức đầu tiên hỗ trợ xác thực SSO OAuth2 PKCE và đồng bộ số dư.",
    },
    update: {
      isLatest: true,
      fileUrl: "https://pub-72586750bed84d87a484e63bbf7b87c0.r2.dev/builds/SmartMoney-Setup-1.0.0.exe",
    },
  });
  console.log("✔ Downloadable Tools (EXE/Installer) upserted");

  // ---------------------------------------------------------------------------
  // 4. OAuth Clients (Enterprise SSO / PKCE) (schema: authentication)
  // ---------------------------------------------------------------------------
  await prisma.oAuthClient.upsert({
    where: { clientId: "demo-windows-tool" },
    create: {
      id: "client-smart-money-win",
      name: "SmartMoney Desktop Application (Windows)",
      clientId: "demo-windows-tool",
      clientSecretHash: null,
      redirectUris: ["http://127.0.0.1:8080/callback", "https://oauth.pstmn.io/v1/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
    update: {
      name: "SmartMoney Desktop Application (Windows)",
      redirectUris: ["http://127.0.0.1:8080/callback", "https://oauth.pstmn.io/v1/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
  });

  await prisma.oAuthClient.upsert({
    where: { clientId: "demo-web-sso" },
    create: {
      id: "client-smart-money-web",
      name: "SmartMoney Web Portal & Sub-apps",
      clientId: "demo-web-sso",
      clientSecretHash: null,
      redirectUris: ["http://localhost:3000/api/auth/callback", "https://app.example.com/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
    update: {
      name: "SmartMoney Web Portal & Sub-apps",
      redirectUris: ["http://localhost:3000/api/auth/callback", "https://app.example.com/callback"],
      isActive: true,
    },
  });
  // VideoTool Desktop (NativeAOT/Avalonia) — native app, public client dùng PKCE loopback.
  // Redirect URI chỉ khai báo host/path; authorization server cho phép cổng loopback ngẫu nhiên
  // theo RFC 8252 §7.3 (xem `isAllowedLoopbackRedirect` trong oauth-service).
  await prisma.oAuthClient.upsert({
    where: { clientId: "video-tool-desktop" },
    create: {
      id: "client-video-tool-desktop",
      name: "VideoTool Desktop (NativeAOT)",
      clientId: "video-tool-desktop",
      clientSecretHash: null,
      redirectUris: ["http://127.0.0.1/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
    update: {
      name: "VideoTool Desktop (NativeAOT)",
      redirectUris: ["http://127.0.0.1/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
  });
  console.log("✔ OAuth Clients upserted: demo-windows-tool, demo-web-sso, video-tool-desktop");

  // ---------------------------------------------------------------------------
  // 5. Apps, Features, Subscription Plans & Dynamic Menus (schema: apps)
  // ---------------------------------------------------------------------------
  const desktopApp = await prisma.app.upsert({
    where: { slug: "smart-money-desktop" },
    create: {
      id: "app-smart-money-desktop",
      slug: "smart-money-desktop",
      name: "SmartMoney Pro Desktop",
      description: "Ứng dụng máy tính quản lý tài chính doanh nghiệp và cá nhân",
      type: "DESKTOP_TOOL",
      status: "ACTIVE",
    },
    update: {
      name: "SmartMoney Pro Desktop",
      description: "Ứng dụng máy tính quản lý tài chính doanh nghiệp và cá nhân",
      type: "DESKTOP_TOOL",
      status: "ACTIVE",
    },
  });

  const featReport = await prisma.feature.upsert({
    where: { key: "FINANCIAL_REPORT" },
    create: {
      id: "feat-fin-report",
      key: "FINANCIAL_REPORT",
      name: "Báo cáo tài chính chuyên sâu",
      description: "Phân tích báo cáo lãi lỗ, dòng tiền và biểu đồ tăng trưởng",
    },
    update: {
      name: "Báo cáo tài chính chuyên sâu",
      description: "Phân tích báo cáo lãi lỗ, dòng tiền và biểu đồ tăng trưởng",
    },
  });

  const featAi = await prisma.feature.upsert({
    where: { key: "AI_ADVISOR" },
    create: {
      id: "feat-ai-advisor",
      key: "AI_ADVISOR",
      name: "Trợ lý AI SmartMoney",
      description: "Gợi ý chiến lược cắt giảm chi phí và tối ưu nguồn vốn",
    },
    update: {
      name: "Trợ lý AI SmartMoney",
      description: "Gợi ý chiến lược cắt giảm chi phí và tối ưu nguồn vốn",
    },
  });

  const featExport = await prisma.feature.upsert({
    where: { key: "EXCEL_EXPORT" },
    create: {
      id: "feat-excel-export",
      key: "EXCEL_EXPORT",
      name: "Xuất dữ liệu Excel & PDF",
      description: "Tải file dữ liệu báo cáo kế toán không giới hạn",
    },
    update: {
      name: "Xuất dữ liệu Excel & PDF",
      description: "Tải file dữ liệu báo cáo kế toán không giới hạn",
    },
  });

  // Plans (1 tháng, 3 tháng, 1 năm)
  const planMonth = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-month-01" },
    create: {
      id: "plan-month-01",
      appId: desktopApp.id,
      name: "Gói Tiêu Chuẩn 1 Tháng",
      description: "Thích hợp cho cá nhân và người mới bắt đầu",
      isActive: true,
    },
    update: {
      name: "Gói Tiêu Chuẩn 1 Tháng",
      isActive: true,
    },
  });
  await prisma.subscriptionPlanPrice.upsert({
    where: { planId_months_currency: { planId: planMonth.id, months: 1, currency: "VND" } },
    create: { planId: planMonth.id, months: 1, currency: "VND", amount: 99000 },
    update: { amount: 99000 },
  });

  const planQuarter = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-quarter-01" },
    create: {
      id: "plan-quarter-01",
      appId: desktopApp.id,
      name: "Gói Nâng Cao 3 Tháng",
      description: "Tiết kiệm 15%, mở khóa đầy đủ tính năng",
      isActive: true,
    },
    update: {
      name: "Gói Nâng Cao 3 Tháng",
      isActive: true,
    },
  });
  await prisma.subscriptionPlanPrice.upsert({
    where: { planId_months_currency: { planId: planQuarter.id, months: 3, currency: "VND" } },
    create: { planId: planQuarter.id, months: 3, currency: "VND", amount: 249000 },
    update: { amount: 249000 },
  });

  const planYear = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-year-01" },
    create: {
      id: "plan-year-01",
      appId: desktopApp.id,
      name: "Gói VIP Doanh Nghiệp 1 Năm",
      description: "Đầy đủ tính năng, hỗ trợ kỹ thuật ưu tiên 24/7",
      isActive: true,
    },
    update: {
      name: "Gói VIP Doanh Nghiệp 1 Năm",
      isActive: true,
    },
  });
  await prisma.subscriptionPlanPrice.upsert({
    where: { planId_months_currency: { planId: planYear.id, months: 12, currency: "VND" } },
    create: { planId: planYear.id, months: 12, currency: "VND", amount: 890000 },
    update: { amount: 890000 },
  });

  // Plan features mapping
  const mappings = [
    { planId: planMonth.id, featureId: featReport.id },
    { planId: planMonth.id, featureId: featExport.id },
    { planId: planQuarter.id, featureId: featReport.id },
    { planId: planQuarter.id, featureId: featExport.id },
    { planId: planQuarter.id, featureId: featAi.id },
    { planId: planYear.id, featureId: featReport.id },
    { planId: planYear.id, featureId: featExport.id },
    { planId: planYear.id, featureId: featAi.id },
  ];
  for (const m of mappings) {
    await prisma.planFeature.upsert({
      where: {
        planId_featureId: {
          planId: m.planId,
          featureId: m.featureId,
        },
      },
      create: m,
      update: {},
    });
  }

  // Dynamic Menus (FREE vs PAID)
  const menuData = [
    {
      id: "menu-dashboard",
      appId: desktopApp.id,
      label: "Tổng quan tài chính",
      path: "/dashboard",
      icon: "LayoutDashboard",
      sortOrder: 1,
      access: "FREE" as const,
      requiredFeatureId: null,
    },
    {
      id: "menu-transactions",
      appId: desktopApp.id,
      label: "Sổ giao dịch",
      path: "/transactions",
      icon: "Receipt",
      sortOrder: 2,
      access: "FREE" as const,
      requiredFeatureId: null,
    },
    {
      id: "menu-reports",
      appId: desktopApp.id,
      label: "Báo cáo phân tích chuyên sâu",
      path: "/reports",
      icon: "BarChart3",
      sortOrder: 3,
      access: "PAID" as const,
      requiredFeatureId: featReport.id,
    },
    {
      id: "menu-ai",
      appId: desktopApp.id,
      label: "Trợ lý AI SmartMoney",
      path: "/ai-advisor",
      icon: "Bot",
      sortOrder: 4,
      access: "PAID" as const,
      requiredFeatureId: featAi.id,
    },
    {
      id: "menu-export",
      appId: desktopApp.id,
      label: "Xuất báo cáo kế toán",
      path: "/export",
      icon: "Download",
      sortOrder: 5,
      access: "PAID" as const,
      requiredFeatureId: featExport.id,
    },
  ];

  for (const menu of menuData) {
    await prisma.appMenuItem.upsert({
      where: { id: menu.id },
      create: menu,
      update: {
        label: menu.label,
        path: menu.path,
        icon: menu.icon,
        sortOrder: menu.sortOrder,
        access: menu.access,
        requiredFeatureId: menu.requiredFeatureId,
      },
    });
  }
  console.log("✔ Apps, Plans & Dynamic Menus upserted");

  // ---------------------------------------------------------------------------
  // 5b. DirectorCraft Studio (slug video-tool) — gói Pro 1/6/12 tháng (schema: apps)
  // ---------------------------------------------------------------------------
  await seedDirectorCraft(prisma, demoId);
  console.log("✔ DirectorCraft app, features, Pro plan (1/6/12 tháng), menus & demo subscription upserted");

  // ---------------------------------------------------------------------------
  // 6. User Subscription (Demo user có gói 1 năm)
  // ---------------------------------------------------------------------------
  await prisma.userSubscription.upsert({
    where: { id: "sub-demo-year" },
    create: {
      id: "sub-demo-year",
      userId: demoId,
      appId: desktopApp.id,
      planId: planYear.id,
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    update: {
      status: "ACTIVE",
      endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  console.log("✔ User Subscription (Demo VIP 1 Năm) upserted");

  // ---------------------------------------------------------------------------
  // 6. AI Gateway Seed (Clients & Provider Keys)
  // ---------------------------------------------------------------------------
  const demoAiClient = await prisma.aiClient.upsert({
    where: { apiKey: "sk_gateway_demo_123" },
    create: {
      name: "Smart Money AI Desktop Tool",
      apiKey: "sk_gateway_demo_123",
      status: "ACTIVE",
      rateLimitPerMin: 120,
      allowedProviders: ["openai", "gemini", "fal-ai", "luma", "openai-tts"],
      allowedTasks: ["TEXT", "IMAGE", "VIDEO", "AUDIO"],
    },
    update: {
      status: "ACTIVE",
      rateLimitPerMin: 120,
    },
  });
  console.log(`✔ AI Gateway Client upserted: ${demoAiClient.name} (API Key: ${demoAiClient.apiKey})`);

  // Provider keys (System Pool)
  const defaultOpenAiKey = process.env.OPENAI_API_KEY || "sk-mock-openai-key-primary";
  await prisma.aiProviderKey.upsert({
    where: { id: "openai-primary-key" },
    create: {
      id: "openai-primary-key",
      provider: "openai",
      alias: "OpenAI Primary System Key",
      keySecret: defaultOpenAiKey,
      status: "ACTIVE",
      weight: 10,
    },
    update: {
      keySecret: defaultOpenAiKey,
      status: "ACTIVE",
    },
  });

  const defaultGeminiKey = process.env.GEMINI_API_KEY || "AIzaSyMockGeminiKey";
  await prisma.aiProviderKey.upsert({
    where: { id: "gemini-primary-key" },
    create: {
      id: "gemini-primary-key",
      provider: "gemini",
      alias: "Gemini Pro System Key",
      keySecret: defaultGeminiKey,
      status: "ACTIVE",
      weight: 10,
    },
    update: {
      keySecret: defaultGeminiKey,
      status: "ACTIVE",
    },
  });
  console.log("✔ AI Gateway Provider Keys upserted (OpenAI, Gemini)");

  console.log("\n=======================================================");
  console.log("✔ Dữ liệu thực tế trên Local DB đã được cập nhật thành công!");
  console.log("  - Tài khoản Admin: admin@promptworks.app");
  console.log("  - Tài khoản Demo (VIP 1 năm): explorer@promptworks.app");
  console.log("  - AI Gateway Test Key: sk_gateway_demo_123");
  console.log("  - OAuth Client ID: demo-windows-tool");
  console.log("  - OAuth Client ID (native): video-tool-desktop");
  console.log("  - App Slug: smart-money-desktop / video-tool");
  console.log("=======================================================\n");
}

main()
  .catch((error) => {
    console.error("Lỗi cập nhật DB:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
