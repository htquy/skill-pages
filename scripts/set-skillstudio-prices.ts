/**
 * Đặt giá gói Pro của SkillStudio (1 / 6 / 12 tháng) trong DB.
 *
 *   npx tsx scripts/set-skillstudio-prices.ts --target local      [--dry-run]
 *   npx tsx scripts/set-skillstudio-prices.ts --target supabase   [--dry-run]
 *
 * - local    → DATABASE_URL (từ .env)
 * - supabase → SUPABASE_DATABASE_URL (đặt trong môi trường lúc chạy, KHÔNG ghi vào file)
 * Chỉ cập nhật `amount` của các dòng giá đã có (đơn hàng cũ giữ nguyên số tiền đã chốt); thiếu dòng nào thì tạo.
 * Không in giá trị của biến môi trường.
 */
import { PrismaClient } from "@prisma/client";
import { SKILLSTUDIO_PRO_PRICES } from "../prisma/seed-skillstudio";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const target = arg("target") ?? "local";
const dryRun = process.argv.includes("--dry-run");
if (target !== "local" && target !== "supabase") throw new Error("--target phải là local hoặc supabase");
const url = target === "local" ? process.env.DATABASE_URL : process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error(`Thiếu ${target === "local" ? "DATABASE_URL" : "SUPABASE_DATABASE_URL"} trong môi trường.`);

const prisma = new PrismaClient({ datasources: { db: { url } } });
const PLAN_ID = "plan-skillstudio-pro";

async function main() {
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: PLAN_ID }, include: { prices: true } });
  if (!plan) throw new Error(`Không thấy gói ${PLAN_ID}: chạy scripts/publish-product-pages.ts trước.`);
  console.log(`Đích: ${target}${dryRun ? " (dry-run)" : ""} · gói ${plan.name}`);
  for (const want of SKILLSTUDIO_PRO_PRICES) {
    const row = plan.prices.find((p) => p.months === want.months && p.currency === "VND");
    const before = row ? row.amount : "(chưa có)";
    console.log(`  ${want.months} tháng: ${before} -> ${want.amount}`);
    if (dryRun) continue;
    await prisma.subscriptionPlanPrice.upsert({
      where: { planId_months_currency: { planId: PLAN_ID, months: want.months, currency: "VND" } },
      create: { planId: PLAN_ID, months: want.months, currency: "VND", amount: want.amount },
      update: { amount: want.amount },
    });
  }
  // các kỳ hạn không còn trong bảng giá mới không bị xoá; chỉ báo để bạn quyết định
  const extra = plan.prices.filter((p) => !SKILLSTUDIO_PRO_PRICES.some((w) => w.months === p.months && p.currency === "VND"));
  if (extra.length) console.log("  lưu ý: còn kỳ hạn ngoài bảng giá mới:", extra.map((p) => `${p.months}m=${p.amount}${p.currency}`).join(", "));
  const after = await prisma.subscriptionPlanPrice.findMany({ where: { planId: PLAN_ID }, orderBy: { months: "asc" } });
  console.log("Hiện tại:", after.map((p) => `${p.months}m=${p.amount}${p.currency}`).join(" | "));
}

main().catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exit(1); }).finally(() => prisma.$disconnect());
