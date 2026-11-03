import { PrismaClient } from "@prisma/client";
import { seedDirectorCraft } from "../prisma/seed-directorcraft";

// Không hard-code chuỗi kết nối (có mật khẩu) trong mã nguồn: đặt SUPABASE_DATABASE_URL khi chạy script.
const supabaseUrl = process.env.SUPABASE_DATABASE_URL;
if (!supabaseUrl) {
  throw new Error("Thiếu SUPABASE_DATABASE_URL (chuỗi kết nối Postgres của Supabase).");
}

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

  const videoApp = await seedDirectorCraft(prisma);
  console.log(`✅ [App] ${videoApp.slug} - ${videoApp.name}: features, gói Pro 1/6/12 tháng, menus`);

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
