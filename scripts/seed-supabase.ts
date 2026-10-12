import { PrismaClient } from "@prisma/client";

const supabaseUrl = "postgresql://postgres.fpqrrbdzeqmlnsjvgfeb:Ra9WjSfeL0ihrJ7Z@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&statement_cache_size=0";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: supabaseUrl,
    },
  },
});

async function main() {
  console.log("==================================================================");
  console.log("TIẾN HÀNH UPSERT CẤU HÌNH OAUTH CLIENTS & APPS LÊN SUPABASE...");
  console.log("==================================================================");

  // 1. OAuth Clients
  console.log("\n1. Đang nạp OAuth Clients...");
  
  // VideoTool Desktop (NativeAOT/Avalonia)
  const videoClient = await prisma.oAuthClient.upsert({
    where: { clientId: "video-tool-desktop" },
    create: {
      id: "client-video-tool-desktop",
      name: "VideoTool Desktop (NativeAOT)",
      clientId: "video-tool-desktop",
      clientSecretHash: null,
      redirectUris: ["http://127.0.0.1/callback", "http://localhost/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
    update: {
      name: "VideoTool Desktop (NativeAOT)",
      redirectUris: ["http://127.0.0.1/callback", "http://localhost/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
  });
  console.log(`✅ [OAuth Client] ${videoClient.clientId} - ${videoClient.name}`);

  // Demo Windows Tool
  const winClient = await prisma.oAuthClient.upsert({
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
  console.log(`✅ [OAuth Client] ${winClient.clientId} - ${winClient.name}`);

  // Demo Web SSO
  const webClient = await prisma.oAuthClient.upsert({
    where: { clientId: "demo-web-sso" },
    create: {
      id: "client-smart-money-web",
      name: "SmartMoney Web Portal & Sub-apps",
      clientId: "demo-web-sso",
      clientSecretHash: null,
      redirectUris: ["http://localhost:3000/api/auth/callback", "https://app.example.com/callback", "https://www.onedaybetter.online/api/auth/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
    update: {
      name: "SmartMoney Web Portal & Sub-apps",
      redirectUris: ["http://localhost:3000/api/auth/callback", "https://app.example.com/callback", "https://www.onedaybetter.online/api/auth/callback"],
      scopes: ["openid", "profile", "email"],
      isPublic: true,
      isActive: true,
    },
  });
  console.log(`✅ [OAuth Client] ${webClient.clientId} - ${webClient.name}`);

  // 2. Apps, Features, Subscription Plans
  console.log("\n2. Đang nạp Apps, Features & Subscription Plans...");

  // VideoTool App
  const videoApp = await prisma.app.upsert({
    where: { slug: "video-tool" },
    create: {
      id: "app-video-tool",
      slug: "video-tool",
      name: "Video Tool",
      description: "Công cụ xử lý video FFmpeg (NativeAOT + Avalonia)",
      type: "DESKTOP_TOOL",
      status: "ACTIVE",
    },
    update: {
      name: "Video Tool",
      description: "Công cụ xử lý video FFmpeg (NativeAOT + Avalonia)",
      type: "DESKTOP_TOOL",
      status: "ACTIVE",
    },
  });
  console.log(`✅ [App] ${videoApp.slug} - ${videoApp.name}`);

  // Features
  const featBatch = await prisma.feature.upsert({
    where: { key: "VIDEO_BATCH" },
    create: {
      id: "feat-video-batch",
      key: "VIDEO_BATCH",
      name: "Xử lý hàng loạt",
      description: "Đưa nhiều file vào hàng đợi và xử lý cùng lúc",
    },
    update: { name: "Xử lý hàng loạt" },
  });

  const featGpu = await prisma.feature.upsert({
    where: { key: "VIDEO_GPU" },
    create: {
      id: "feat-video-gpu",
      key: "VIDEO_GPU",
      name: "Tăng tốc GPU (NVENC)",
      description: "Dùng card đồ họa để tăng tốc mã hóa video",
    },
    update: { name: "Tăng tốc GPU (NVENC)" },
  });

  const featNoWatermark = await prisma.feature.upsert({
    where: { key: "VIDEO_NO_WATERMARK" },
    create: {
      id: "feat-video-no-watermark",
      key: "VIDEO_NO_WATERMARK",
      name: "Xuất không watermark",
      description: "Bỏ logo/watermark trên video xuất ra",
    },
    update: { name: "Xuất không watermark" },
  });

  // Video Plans
  const videoPlanMonth = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-video-month" },
    create: {
      id: "plan-video-month",
      appId: videoApp.id,
      name: "Video Tool 1 Tháng",
      description: "Mở khóa xử lý hàng loạt",
      currency: "VND",
      price: 99000,
      interval: "MONTH",
      durationDays: 30,
      isActive: true,
    },
    update: { price: 99000, durationDays: 30, isActive: true },
  });

  const videoPlanYear = await prisma.subscriptionPlan.upsert({
    where: { id: "plan-video-year" },
    create: {
      id: "plan-video-year",
      appId: videoApp.id,
      name: "Video Tool 1 Năm",
      description: "Toàn bộ tính năng: hàng loạt, GPU, không watermark",
      currency: "VND",
      price: 790000,
      interval: "YEAR",
      durationDays: 365,
      isActive: true,
    },
    update: { price: 790000, durationDays: 365, isActive: true },
  });

  // Plan features
  const videoMappings = [
    { planId: videoPlanMonth.id, featureId: featBatch.id },
    { planId: videoPlanYear.id, featureId: featBatch.id },
    { planId: videoPlanYear.id, featureId: featGpu.id },
    { planId: videoPlanYear.id, featureId: featNoWatermark.id },
  ];
  for (const m of videoMappings) {
    await prisma.planFeature.upsert({
      where: { planId_featureId: { planId: m.planId, featureId: m.featureId } },
      create: m,
      update: {},
    });
  }

  // Menus
  const videoMenus = [
    { id: "menu-video-trim", label: "Cắt video", path: "/trim", icon: "\uE8C6", sortOrder: 1, access: "FREE" as const, requiredFeatureId: null },
    { id: "menu-video-compress", label: "Nén video", path: "/compress", icon: "\uE721", sortOrder: 2, access: "FREE" as const, requiredFeatureId: null },
    { id: "menu-video-convert", label: "Chuyển định dạng", path: "/convert", icon: "\uE8AB", sortOrder: 3, access: "FREE" as const, requiredFeatureId: null },
    { id: "menu-video-audio", label: "Tách / xóa audio", path: "/audio", icon: "\uE8D6", sortOrder: 4, access: "FREE" as const, requiredFeatureId: null },
    { id: "menu-video-merge", label: "Ghép video", path: "/merge", icon: "\uE723", sortOrder: 5, access: "FREE" as const, requiredFeatureId: null },
    { id: "menu-video-queue", label: "Hàng đợi xử lý", path: "/queue", icon: "\uE8FD", sortOrder: 6, access: "FREE" as const, requiredFeatureId: null },
    { id: "menu-video-batch", label: "Xử lý hàng loạt", path: "/batch", icon: "\uE8EF", sortOrder: 7, access: "PAID" as const, requiredFeatureId: featBatch.id },
    { id: "menu-video-gpu", label: "Tăng tốc GPU (NVENC)", path: "/gpu", icon: "\uE9D9", sortOrder: 8, access: "PAID" as const, requiredFeatureId: featGpu.id },
    { id: "menu-video-watermark", label: "Xuất không watermark", path: "/watermark", icon: "\uE790", sortOrder: 9, access: "PAID" as const, requiredFeatureId: featNoWatermark.id },
  ];
  for (const menu of videoMenus) {
    await prisma.appMenuItem.upsert({
      where: { id: menu.id },
      create: { ...menu, appId: videoApp.id },
      update: { ...menu, appId: videoApp.id },
    });
  }
  console.log("✅ [App Details] Đã nạp đầy đủ Plans & Menus cho video-tool");

  // 3. AI Gateway Client
  console.log("\n3. Đang nạp AI Gateway Client...");
  const demoAiClient = await prisma.aiClient.upsert({
    where: { apiKey: "sk_gateway_demo_123" },
    create: {
      name: "Video Tool AI Gateway Client",
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
  console.log(`✅ [AI Client] ${demoAiClient.name} (Key: ${demoAiClient.apiKey})`);

  console.log("\n==================================================================");
  console.log("🎉 NẠP CẤU HÌNH SEED LÊN SUPABASE THÀNH CÔNG 100%!");
  console.log("==================================================================");
}

main()
  .catch((err) => {
    console.error("Lỗi seed Supabase:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
