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
  console.log("Kiểm tra Prisma Client đọc dữ liệu từ các schema trên Supabase...");

  // 1. authentication.users
  const userCount = await prisma.user.count();
  console.log(`✅ [authentication.users] Tổng số users: ${userCount}`);

  // 2. catalog.skills
  const skillCount = await prisma.skill.count();
  console.log(`✅ [catalog.skills] Tổng số skills: ${skillCount}`);

  // 3. catalog.tools
  const toolCount = await prisma.tool.count();
  console.log(`✅ [catalog.tools] Tổng số tools: ${toolCount}`);

  // 4. payment.orders
  const orderCount = await prisma.order.count();
  console.log(`✅ [payment.orders] Tổng số orders: ${orderCount}`);

  // 5. apps.apps
  const appCount = await prisma.app.count();
  console.log(`✅ [apps.apps] Tổng số apps: ${appCount}`);

  // 6. ai.aiClients
  const aiClientCount = await prisma.aiClient.count();
  console.log(`✅ [ai.ai_clients] Tổng số ai_clients: ${aiClientCount}`);

  console.log("\n🎉 TẤT CẢ CÁC MODEL PRISMA MULTI-SCHEMA TRÊN SUPABASE HOẠT ĐỘNG HOÀN HẢO!");
}

main()
  .catch((err) => {
    console.error("Lỗi:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
