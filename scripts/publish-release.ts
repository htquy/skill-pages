/**
 * Đăng một bản phát hành desktop: upload file lên R2 (public) và ghi ToolVersion "mới nhất" để trang /tools/<slug>
 * hiện nút Tải về.
 *
 *   npx tsx --env-file=.env scripts/publish-release.ts --target local|supabase --tool skillstudio \
 *     --file ../../VideoToolSkill/SkillStudio/artifacts/SkillStudio-win-x64-0.3.0.zip --version 0.3.0 \
 *     [--changelog "…"] [--source-url https://github.com/…/releases/tag/v0.3.0]
 *
 * File trên R2 đặt theo tên + phiên bản (bất biến, cache vĩnh viễn). Repo GitHub private nên link tải công khai luôn là R2.
 * Không in giá trị biến môi trường nào.
 */
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { PrismaClient } from "@prisma/client";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const target = arg("target") ?? "local";
const toolSlug = arg("tool");
const file = arg("file");
const version = arg("version");
if (!toolSlug || !file || !version) throw new Error("Cần --tool, --file và --version");
const dbUrl = target === "supabase" ? process.env.SUPABASE_DATABASE_URL : process.env.DATABASE_URL;
if (!dbUrl) throw new Error(`Thiếu ${target === "supabase" ? "SUPABASE_DATABASE_URL" : "DATABASE_URL"}`);
for (const v of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"])
  if (!process.env[v]) throw new Error(`Thiếu ${v}`);

async function main() {
  const body = readFileSync(file!);
  const size = statSync(file!).size;
  const name = basename(file!);
  const key = `releases/${toolSlug}/${version}/${name}`;
  const url = `${process.env.R2_PUBLIC_URL!.replace(/\/+$/, "")}/${key}`;
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
  });
  try {
    await s3.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }));
    console.log(`= đã có ${key}`);
  } catch {
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!, Key: key, Body: body, ContentType: "application/zip",
      ContentDisposition: `attachment; filename="${name}"`, CacheControl: "public, max-age=31536000, immutable",
    }));
    console.log(`↑ ${key} (${(size / 1048576).toFixed(1)} MB, sha256 ${createHash("sha256").update(body).digest("hex").slice(0, 16)}…)`);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  try {
    const tool = await prisma.tool.findUnique({ where: { slug: toolSlug! }, select: { id: true } });
    if (!tool) throw new Error(`Không có tool ${toolSlug} trên ${target}`);
    const changelog = arg("changelog") ?? null;
    await prisma.$transaction([
      prisma.toolVersion.updateMany({ where: { toolId: tool.id }, data: { isLatest: false } }),
      prisma.toolVersion.upsert({
        where: { toolId_versionCode: { toolId: tool.id, versionCode: version! } },
        create: { toolId: tool.id, versionCode: version!, fileUrl: url, fileName: name, fileSize: BigInt(size), changelog, isLatest: true },
        update: { fileUrl: url, fileName: name, fileSize: BigInt(size), ...(changelog ? { changelog } : {}), isLatest: true },
      }),
    ]);
    console.log(`✓ [${target}] ${toolSlug} v${version} là bản mới nhất → nút Tải về: ${url}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exit(1); });
