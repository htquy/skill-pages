/**
 * Đưa danh sách skill đã chọn lọc từ feed R2 của SkillStudio vào kho /skills (idempotent, chạy lại bao nhiêu lần cũng được).
 *
 *   npx tsx --env-file=.env scripts/seed-skills-from-r2.ts [--dry-run] [--reset-manual] [--prefix skills-feed/] [--price 49000] [--prune]
 *
 * - Nguồn: `${R2_PUBLIC_URL}/<prefix>index.json` -> catalog -> với mỗi skill trong scripts/data/skill-curation.ts đọc
 *   meta.json, SKILL.md, skill.vi.json qua URL công khai. Không cần khóa R2, không ghi gì lên R2.
 * - Mỗi skill: upsert theo `sourceSlug`; lưu r2Prefix + posterKey + previewVideoKey và TỪNG FILE trong thư mục skill
 *   vào catalog."SkillAsset" (r2Key = r2Prefix + path). Nội dung SKILL.md -> SkillVersion v1.
 * - Giá: skill miễn phí trong feed => FREE; còn lại => PAID với 1 giá VND (mặc định 49000).
 * - --reset-manual: xoá các skill KHÔNG có sourceSlug (skill test nhập tay). Đơn hàng PENDING không có giao dịch của chúng
 *   cũng bị xoá; nếu có đơn đã trả / có giao dịch thì dừng, không xoá gì.
 * - Đối chiếu bucket: nếu có R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET_NAME thì liệt kê bucket (chỉ đọc) và
 *   chỉ ghi vào SkillAsset những file THỰC SỰ có trên R2 (catalog có thể liệt kê file chưa được upload); không có khóa thì tin catalog.
 * - --prune: ẩn (ARCHIVED) skill có sourceSlug nhưng không còn trong danh sách chọn lọc.
 */
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { Prisma, PrismaClient } from "@prisma/client";
import { CATEGORIES, CURATED, USE_CASES } from "./data/skill-curation";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const has = (n: string) => process.argv.includes(`--${n}`);
const dryRun = has("dry-run");
const prefix = (arg("prefix") ?? "skills-feed/").replace(/^\/+/, "").replace(/\/?$/, "/");
const PRICE_VND = Number(arg("price") ?? 49000);
const publicBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
if (!publicBase) throw new Error("Thiếu R2_PUBLIC_URL");

type FeedFile = { path: string; sha256: string; size: number; kind: string };
type FeedSkill = { slug: string; category: string; rev: string; free: boolean; files: FeedFile[] };

const prisma = new PrismaClient();

/** GET công khai có retry: r2.dev trả 429/5xx khi bị gọi dồn dập. */
async function fetchRetry(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const r = await fetch(url, init);
    if ((r.status === 429 || r.status >= 500) && attempt < 8) {
      await new Promise((res) => setTimeout(res, 800 * 2 ** (attempt - 1)));
      continue;
    }
    return r;
  }
}
async function getJson<T>(url: string): Promise<T> {
  const r = await fetchRetry(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return (await r.json()) as T;
}
async function getText(url: string): Promise<string | null> {
  const r = await fetchRetry(url);
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return await r.text();
}

const TYPES: Record<string, string> = {
  json: "application/json", md: "text/markdown", webp: "image/webp", mp4: "video/mp4", png: "image/png", jpg: "image/jpeg",
  jpeg: "image/jpeg", svg: "image/svg+xml", txt: "text/plain", js: "text/javascript", mjs: "text/javascript", css: "text/css",
  html: "text/html", sh: "text/x-shellscript", py: "text/x-python", csv: "text/csv", wav: "audio/wav", mp3: "audio/mpeg", zip: "application/zip",
};
const typeOf = (p: string) => TYPES[p.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";

/** Bỏ phần quảng cáo / hướng dẫn cài của Skillry khỏi SKILL.md; giữ phần hướng dẫn dùng skill. */
function cleanSkillMd(raw: string): string {
  let t = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
  t = t.replace(/\r\n/g, "\n");
  t = t.replace(/\n---\n+## Installation via Skillry CLI[\s\S]*$/m, "\n");
  t = t.replace(/\n## Installation via Skillry CLI[\s\S]*$/m, "\n");
  t = t.replace(/^## Visual Preview\n+!\[[^\]]*\]\([^)]*\)\n*/m, "");
  t = t
    .split("\n")
    .filter((l) => !/skillry/i.test(l) && !/^- \*\*(Catalog URL|Category|Access Tier):\*\*/i.test(l) && !/^- Access: /.test(l))
    .join("\n");
  t = t.replace(/\n-{3,}\n(\s*\n)*(?=\n|$)/g, "\n").replace(/^\n*---\n+/, "").replace(/\n{3,}/g, "\n\n");
  return t.trim() + "\n";
}

function frontmatterField(raw: string, key: string): string | undefined {
  const m = new RegExp(`^${key}:\\s*(.+)$`, "m").exec(raw.split(/\r?\n---\r?\n/)[0] ?? "");
  return m ? m[1].trim().replace(/^"(.*)"$/, "$1") : undefined;
}

function cleanTitle(t: string): string {
  // garden-web-*: "hig — Apple Human Interface" -> "Apple Human Interface"
  return t.replace(/^[a-z0-9][a-z0-9-]* — /, "").trim();
}

function firstSentences(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return (stop > 80 ? cut.slice(0, stop + 1) : cut.replace(/\s+\S*$/, "") + "…").trim();
}

async function pool<T, R>(items: T[], n: number, fn: (x: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    for (let i; (i = next++) < items.length; ) out[i] = await fn(items[i], i);
  }));
  return out;
}

async function resetManualSkills() {
  const manual = await prisma.skill.findMany({ where: { sourceSlug: null }, select: { id: true, slug: true } });
  console.log(`skill nhập tay (không có sourceSlug): ${manual.length}`);
  if (manual.length === 0) return;
  const ids = manual.map((s) => s.id);
  const orders = await prisma.order.findMany({
    where: { skillId: { in: ids } },
    select: { id: true, orderCode: true, status: true, _count: { select: { transactions: true, webhookEvents: true } } },
  });
  const blocking = orders.filter((o) => o.status !== "PENDING" || o._count.transactions > 0 || o._count.webhookEvents > 0);
  if (blocking.length) throw new Error(`Không xoá: ${blocking.length} đơn đã thanh toán / có giao dịch (${blocking.map((o) => o.orderCode).join(", ")})`);
  console.log(`  xoá ${orders.length} đơn PENDING (không giao dịch) + ${manual.length} skill: ${manual.map((s) => s.slug).join(", ")}`);
  if (dryRun) return;
  await prisma.$transaction([
    prisma.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) } } }),
    prisma.skill.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

/** Liệt kê object thật trong bucket dưới <prefix>; null nếu không có khóa R2 (khi đó tin catalog). */
async function listBucket(under: string): Promise<Map<string, number> | null> {
  const { R2_ACCOUNT_ID: acc, R2_ACCESS_KEY_ID: key, R2_SECRET_ACCESS_KEY: secret, R2_BUCKET_NAME: Bucket } = process.env;
  if (!acc || !key || !secret || !Bucket) return null;
  const s3 = new S3Client({ region: "auto", endpoint: `https://${acc}.r2.cloudflarestorage.com`, credentials: { accessKeyId: key, secretAccessKey: secret } });
  const out = new Map<string, number>();
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: under, ContinuationToken: token }));
    for (const o of r.Contents ?? []) out.set(o.Key!, o.Size ?? 0);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return out;
}

async function main() {
  console.log(`${dryRun ? "[dry-run] " : ""}feed: ${publicBase}/${prefix}index.json`);
  if (has("reset-manual")) await resetManualSkills();

  const index = await getJson<{ revision: string; catalog: string; filesBase: string }>(`${publicBase}/${prefix}index.json`);
  const catalog = (await getJson<{ skills: FeedSkill[] }>(`${publicBase}/${prefix}${index.catalog}`)).skills;
  const feed = new Map(catalog.map((s) => [s.slug, s]));
  const missing = [...CURATED.keys()].filter((s) => !feed.has(s));
  if (missing.length) throw new Error(`Không có trong feed: ${missing.join(", ")}`);
  console.log(`revision ${index.revision}: ${catalog.length} skill trong feed, chọn ${CURATED.size}`);

  const bucket = await listBucket(`${prefix}${index.filesBase}`);
  console.log(bucket ? `đối chiếu bucket: ${bucket.size} object` : "không có khóa R2: tin catalog, không đối chiếu bucket");

  // ---- đọc nội dung từng skill (song song, chỉ GET công khai)
  const slugs = [...CURATED.keys()];
  const loaded = await pool(slugs, 3, async (slug) => {
    const s = feed.get(slug)!;
    const base = `${prefix}${index.filesBase}${s.category}/${slug}/`;
    const names = new Set(s.files.map((f) => f.path));
    const [metaRaw, mdRaw, viRaw] = await Promise.all([
      names.has("meta.json") ? getText(`${publicBase}/${base}meta.json`) : null,
      getText(`${publicBase}/${base}SKILL.md`),
      names.has("skill.vi.json") ? getText(`${publicBase}/${base}skill.vi.json`) : null,
    ]);
    if (!mdRaw) throw new Error(`${slug}: thiếu SKILL.md`);
    const meta = metaRaw ? (JSON.parse(metaRaw) as { title?: string; description?: string }) : {};
    const vi = viRaw ? (JSON.parse(viRaw) as { description?: string }) : {};
    const heading = /^# (.+)$/m.exec(mdRaw.replace(/^---[\s\S]*?\n---\n/, ""))?.[1];
    const title = cleanTitle(meta.title ?? heading ?? slug);
    const description = (meta.description ?? frontmatterField(mdRaw, "description") ?? title).replace(/\s+/g, " ").trim();
    const files = bucket ? s.files.filter((f) => bucket.has(base + f.path)) : s.files;
    if (files.length !== s.files.length)
      console.warn(`  ! ${slug}: ${s.files.length - files.length} file trong catalog không có trên R2: ${s.files.filter((f) => !files.includes(f)).map((f) => f.path).join(", ")}`);
    return { slug, s, files, base, title, description, vi: vi.description?.trim(), content: cleanSkillMd(mdRaw) };
  });

  // ---- taxonomy
  const categoryId = new Map<string, string>();
  const useCaseId = new Map<string, string>();
  if (!dryRun) {
    for (const [slug, c] of Object.entries(CATEGORIES)) {
      const row = await prisma.skillCategory.upsert({ where: { slug }, update: { name: c.name, description: c.description }, create: { slug, name: c.name, description: c.description } });
      categoryId.set(slug, row.id);
    }
    for (const [slug, u] of Object.entries(USE_CASES)) {
      const row = await prisma.useCase.upsert({ where: { slug }, update: { name: u.name, description: u.description }, create: { slug, name: u.name, description: u.description } });
      useCaseId.set(slug, row.id);
    }
  }

  // ---- thứ tự hiển thị: mặc định /skills sắp theo favoriteCount rồi createdAt (mới nhất trước) => gán createdAt
  // theo vòng luân phiên giữa các use-case, skill miễn phí đứng trước trong mỗi nhóm, để trang đầu có đủ thể loại.
  const byUseCase = new Map<string, typeof loaded>();
  for (const l of loaded) byUseCase.set(CURATED.get(l.slug)!, [...(byUseCase.get(CURATED.get(l.slug)!) ?? []), l]);
  for (const list of byUseCase.values()) list.sort((a, b) => Number(b.s.free) - Number(a.s.free));
  const ordered: typeof loaded = [];
  for (let round = 0; ordered.length < loaded.length; round++)
    for (const list of byUseCase.values()) if (list[round]) ordered.push(list[round]);
  const t0 = Date.now() - ordered.length * 1000;

  let created = 0, updated = 0, free = 0, paid = 0, assets = 0;
  for (const [i, l] of ordered.entries()) {
    const { slug, s, files } = l;
    const publicSlug = slug.replace(/^bs-/, "");
    const useCase = CURATED.get(slug)!;
    const isFree = s.free;
    const poster = files.find((f) => f.kind === "poster")?.path;
    const video = files.find((f) => f.kind === "video")?.path;
    const r2Prefix = l.base;
    const posterKey = poster ? r2Prefix + poster : null;
    const previewVideoKey = video ? r2Prefix + video : null;
    const shortDescription = firstSentences(l.description, 220);
    const translations: Prisma.InputJsonValue | typeof Prisma.JsonNull = l.vi
      ? { vi: { shortDescription: firstSentences(l.vi, 220), description: l.vi } }
      : Prisma.JsonNull;
    const data = {
      slug: publicSlug,
      title: l.title.slice(0, 200),
      shortDescription,
      description: l.description,
      accessType: isFree ? ("FREE" as const) : ("PAID" as const),
      status: "PUBLISHED" as const,
      coverImageUrl: posterKey ? `${publicBase}/${posterKey}` : null,
      videoDemoUrl: previewVideoKey ? `${publicBase}/${previewVideoKey}` : null,
      sourceSlug: slug,
      r2Prefix,
      posterKey,
      previewVideoKey,
      sourceRevision: s.rev,
      translations,
    };
    if (isFree) free++; else paid++;
    assets += files.length;
    if (dryRun) continue;

    const when = new Date(t0 + (ordered.length - i) * 1000); // /skills sắp createdAt giảm dần => phần tử đầu danh sách chọn lọc hiện trước
    const existing = await prisma.skill.findUnique({ where: { sourceSlug: slug }, select: { id: true } });
    const skill = existing
      ? await prisma.skill.update({ where: { id: existing.id }, data: { ...data, publishedAt: when, createdAt: when } })
      : await prisma.skill.create({ data: { ...data, publishedAt: when, createdAt: when } });
    if (existing) updated++; else created++;

    await prisma.skillVersion.upsert({
      where: { skillId_version: { skillId: skill.id, version: 1 } },
      update: { content: l.content, changelog: `Synced from the R2 skills feed (rev ${s.rev})` },
      create: { skillId: skill.id, version: 1, content: l.content, changelog: `Synced from the R2 skills feed (rev ${s.rev})` },
    });

    await prisma.skillAsset.deleteMany({ where: { skillId: skill.id } });
    await prisma.skillAsset.createMany({
      data: files.map((f) => ({
        skillId: skill.id, path: f.path, r2Key: r2Prefix + f.path, kind: f.kind, contentType: typeOf(f.path),
        sizeBytes: BigInt(f.size), sha256: f.sha256,
      })),
    });

    await prisma.skillPrice.deleteMany({ where: { skillId: skill.id } });
    if (!isFree) await prisma.skillPrice.create({ data: { skillId: skill.id, currency: "VND", amount: PRICE_VND, isActive: true } });

    await prisma.skillCategoryLink.deleteMany({ where: { skillId: skill.id } });
    await prisma.skillUseCaseLink.deleteMany({ where: { skillId: skill.id } });
    await prisma.skillCategoryLink.create({ data: { skillId: skill.id, categoryId: categoryId.get(s.category)! } });
    await prisma.skillUseCaseLink.create({ data: { skillId: skill.id, useCaseId: useCaseId.get(useCase)! } });
  }

  if (has("prune") && !dryRun) {
    const r = await prisma.skill.updateMany({ where: { sourceSlug: { not: null, notIn: slugs } }, data: { status: "ARCHIVED" } });
    console.log(`đã ẩn ${r.count} skill không còn trong danh sách chọn lọc`);
  }

  // ---- dọn taxonomy cũ không còn skill / xếp hạng nào dùng (prompt, workflow, ngành, ...)
  if (!dryRun) {
    const cats = await prisma.skillCategory.deleteMany({ where: { skills: { none: {} }, rankings: { none: {} }, slug: { notIn: Object.keys(CATEGORIES) } } });
    const useCases = await prisma.useCase.deleteMany({ where: { skills: { none: {} }, slug: { notIn: Object.keys(USE_CASES) } } });
    console.log(`đã dọn ${cats.count} danh mục + ${useCases.count} use-case cũ không còn dùng`);
  }

  console.log(`${dryRun ? "sẽ " : ""}${created} tạo mới, ${updated} cập nhật · ${free} FREE, ${paid} PAID ${PRICE_VND.toLocaleString("vi-VN")}đ · ${assets} file R2 được ghi nhận`);
}

main()
  .catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
