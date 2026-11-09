/**
 * Đăng trang giới thiệu SkillStudio + DirectorCraft (nội dung, video demo, ảnh bìa) lên DB và R2.
 *
 *   npx tsx scripts/publish-product-pages.ts --target local    --media <thư mục media>
 *   npx tsx scripts/publish-product-pages.ts --target supabase --media <thư mục media>
 *   thêm --dry-run để chỉ in ra việc sẽ làm.
 *
 * - local    → DATABASE_URL (đọc từ .env)
 * - supabase → SUPABASE_DATABASE_URL (đặt trong môi trường lúc chạy, KHÔNG ghi vào file)
 * - R2       → R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL (như app).
 *              Thiếu biến R2 thì bỏ qua upload và giữ nguyên URL media đang có trong DB.
 *
 * Object key theo nội dung (sha256) nên chạy lại không tạo bản trùng và CDN cache vĩnh viễn được.
 * Script không in giá trị của bất kỳ biến môi trường nào.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";
import { DIRECTORCRAFT_PAGE, PRODUCT_PAGES, type ProductPage } from "../prisma/product-pages";
import { seedSkillStudio } from "../prisma/seed-skillstudio";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const target = arg("target") ?? "local";
const mediaDir = resolve(arg("media") ?? "./product-media");
const dryRun = process.argv.includes("--dry-run");

if (target !== "local" && target !== "supabase") throw new Error("--target phải là local hoặc supabase");
const dbUrl = target === "local" ? process.env.DATABASE_URL : process.env.SUPABASE_DATABASE_URL;
if (!dbUrl) throw new Error(`Thiếu ${target === "local" ? "DATABASE_URL" : "SUPABASE_DATABASE_URL"} trong môi trường.`);

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"] as const;
const r2Ready = R2_VARS.every((v) => Boolean(process.env[v]));
const s3 = r2Ready
  ? new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
    })
  : null;

const CONTENT_TYPES: Record<string, string> = { mp4: "video/mp4", webm: "video/webm", png: "image/png", jpg: "image/jpeg", webp: "image/webp" };

/** Upload nếu object chưa có; trả về URL public, hoặc null khi không upload được. */
async function upload(slug: string, file: string): Promise<string | null> {
  const path = join(mediaDir, file);
  if (!existsSync(path)) {
    console.warn(`  ! không thấy ${path} — bỏ qua`);
    return null;
  }
  const body = readFileSync(path);
  const hash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  const ext = basename(file).split(".").pop()!.toLowerCase();
  const key = `product-media/${slug}/${basename(file, "." + ext)}-${hash}.${ext}`;
  const url = `${process.env.R2_PUBLIC_URL?.replace(/\/+$/, "")}/${key}`;
  if (!s3) {
    console.warn(`  ! thiếu biến R2 (${R2_VARS.join(", ")}) — không upload ${file}`);
    return null;
  }
  if (dryRun) {
    console.log(`  [dry-run] PUT ${key} (${(statSync(path).size / 1048576).toFixed(1)} MB)`);
    return url;
  }
  try {
    await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
    console.log(`  = đã có ${key}`);
  } catch {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
        Body: body,
        ContentType: CONTENT_TYPES[ext] ?? "application/octet-stream",
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    console.log(`  ↑ ${key} (${(body.length / 1048576).toFixed(1)} MB)`);
  }
  return url;
}

async function publishPage(prisma: PrismaClient, page: ProductPage) {
  console.log(`\n• ${page.slug}`);
  const videoDemoUrl = await upload(page.slug, page.media.video);
  const coverImageUrl = await upload(page.slug, page.media.cover);
  const data = {
    title: page.title,
    shortDescription: page.shortDescription,
    description: page.description,
    appSlug: page.appSlug,
    status: "PUBLISHED" as const,
    ...(videoDemoUrl ? { videoDemoUrl } : {}),
    ...(coverImageUrl ? { coverImageUrl } : {}),
  };
  if (dryRun) {
    console.log(`  [dry-run] upsert tool ${page.slug}: ${Object.keys(data).join(", ")}`);
    return;
  }
  // App đã có trang giới thiệu cũ (slug khác, ví dụ "video-2d-hoat-anh") → cập nhật đúng trang đó, giữ slug/URL cũ,
  // và gỡ bản trùng mang slug mặc định nếu một lần chạy/seed trước đã tạo ra nó.
  const legacy = await prisma.tool.findFirst({
    where: { appSlug: page.appSlug, slug: { not: page.slug } },
    orderBy: { createdAt: "asc" },
    select: { id: true, slug: true, publishedAt: true },
  });
  const own = await prisma.tool.findUnique({ where: { slug: page.slug }, select: { id: true, publishedAt: true } });
  const target = legacy ?? own;
  if (target) {
    await prisma.tool.update({ where: { id: target.id }, data: { ...data, publishedAt: target.publishedAt ?? new Date() } });
    if (legacy && own) {
      await prisma.tool.delete({ where: { id: own.id } });
      console.log(`  − gỡ bản trùng ${page.slug} (trang chính là ${legacy.slug})`);
    }
  } else {
    await prisma.tool.create({ data: { slug: page.slug, type: "DOWNLOADABLE", billingType: "SUBSCRIPTION", publishedAt: new Date(), ...data } });
  }
  const slug = legacy?.slug ?? page.slug;
  console.log(`  ✓ tool ${slug} ${target ? "cập nhật" : "tạo mới"}${videoDemoUrl ? " + video" : ""}${coverImageUrl ? " + ảnh bìa" : ""} → /tools/${slug}`);
}

async function main() {
  console.log(`Đích: ${target}${dryRun ? " (dry-run)" : ""} · media: ${mediaDir} · R2: ${r2Ready ? "sẵn sàng" : "chưa cấu hình"}`);
  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    if (!dryRun) {
      await seedSkillStudio(prisma); // app, features, gói Pro, menu, OAuth client, tool
      console.log("✓ SkillStudio: app skill-studio, 3 feature, gói Pro, menu, OAuth client skill-studio-desktop");
      // DirectorCraft: mô tả app ngắn gọn hơn khớp trang giới thiệu (app slug giữ video-tool).
      await prisma.app.updateMany({
        where: { slug: DIRECTORCRAFT_PAGE.appSlug },
        data: { description: "Xưởng làm phim & motion 2D bằng AI — chạy trên máy, không cần API key" },
      });
    }
    for (const page of PRODUCT_PAGES) await publishPage(prisma, page);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("Lỗi:", e instanceof Error ? e.message : e);
  process.exit(1);
});
