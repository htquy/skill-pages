/** Liệt kê tool (slug, tiêu đề, appSlug, trạng thái, có video/ảnh bìa không) của DB đích. Không in thông tin nhạy cảm. */
import { PrismaClient } from "@prisma/client";

const target = process.argv.includes("--supabase") ? "supabase" : "local";
const url = target === "local" ? process.env.DATABASE_URL : process.env.SUPABASE_DATABASE_URL;
if (!url) throw new Error(`Thiếu ${target === "local" ? "DATABASE_URL" : "SUPABASE_DATABASE_URL"}`);
const prisma = new PrismaClient({ datasources: { db: { url } } });
prisma.tool
  .findMany({ select: { slug: true, title: true, appSlug: true, status: true, videoDemoUrl: true, coverImageUrl: true }, orderBy: { createdAt: "asc" } })
  .then((rows) => {
    console.log(`[${target}] ${rows.length} tool`);
    for (const r of rows) console.log(`- ${r.slug} | ${r.title} | app=${r.appSlug ?? "-"} | ${r.status} | video=${r.videoDemoUrl ? "y" : "n"} cover=${r.coverImageUrl ? "y" : "n"}`);
  })
  .finally(() => prisma.$disconnect());
