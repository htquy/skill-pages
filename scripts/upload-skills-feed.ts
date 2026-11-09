/**
 * Uploads the SkillStudio skill feed (output of `skillstudio skills pack skills r2-skills`) to R2.
 *
 *   npx tsx --env-file=.env scripts/upload-skills-feed.ts --dir ../../VideoToolSkill/r2-skills [--prefix skills-feed/] [--dry-run]
 *
 * - Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL. Never prints them.
 * - Recursive. Skips an object that already exists with the same size and sha256 (object metadata), so re-runs only send what changed.
 * - index.json goes LAST: clients only switch to the new revision once catalog/ and skills/ are all in place.
 * - Cache: index.json no-cache; catalog/ and skills/ are immutable-ish (the app always asks with ?v=<sha>).
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const dir = resolve(arg("dir") ?? "./r2-skills");
const prefix = (arg("prefix") ?? "skills-feed/").replace(/^\/+/, "").replace(/\/?$/, "/");
const dryRun = process.argv.includes("--dry-run");
const CONCURRENCY = 8;
for (const v of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"])
  if (!process.env[v]) throw new Error(`Thiếu ${v}`);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});
const bucket = process.env.R2_BUCKET_NAME!;
const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");

const TYPES: Record<string, string> = {
  json: "application/json", md: "text/markdown; charset=utf-8", webp: "image/webp", mp4: "video/mp4", png: "image/png",
  jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", txt: "text/plain; charset=utf-8", js: "text/javascript; charset=utf-8",
  mjs: "text/javascript; charset=utf-8", css: "text/css; charset=utf-8", html: "text/html; charset=utf-8", sh: "text/plain; charset=utf-8",
  py: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8", wav: "audio/wav", mp3: "audio/mpeg", zip: "application/zip",
};
const typeOf = (f: string) => TYPES[f.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";

function walk(d: string): string[] {
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
}

async function main() {
  const all = walk(dir).map((p) => ({ path: p, key: prefix + relative(dir, p).split(sep).join("/") }))
    .filter((f) => !f.key.endsWith("/README.md"));
  const index = all.find((f) => f.key === prefix + "index.json");
  if (!index) throw new Error("r2-skills không có index.json");
  const rest = all.filter((f) => f !== index);
  console.log(`${dryRun ? "[dry-run] " : ""}${all.length} file → ${publicBase}/${prefix}`);

  let uploaded = 0, skipped = 0, bytes = 0, done = 0;
  // R2 occasionally answers "internal error"/5xx under load: retry with backoff before giving up
  const retry = async <T>(fn: () => Promise<T>): Promise<T> => {
    for (let attempt = 1; ; attempt++) {
      try { return await fn(); }
      catch (e) {
        if (attempt >= 6) throw e;
        await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
      }
    }
  };
  const send = async (f: { path: string; key: string }) => {
    const body = readFileSync(f.path);
    const sha = createHash("sha256").update(body).digest("hex");
    let same = false;
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: f.key }));
      same = head.ContentLength === body.length && head.Metadata?.sha256 === sha;
    } catch { /* not there yet */ }
    if (same) { skipped++; }
    else if (dryRun) { uploaded++; bytes += body.length; }
    else {
      await retry(() => s3.send(new PutObjectCommand({
        Bucket: bucket, Key: f.key, Body: body, ContentType: typeOf(f.key), Metadata: { sha256: sha },
        CacheControl: f.key === prefix + "index.json" ? "no-cache" : "public, max-age=31536000",
      })));
      const head = await retry(() => s3.send(new HeadObjectCommand({ Bucket: bucket, Key: f.key })));
      if (head.ContentLength !== body.length) throw new Error(`${f.key}: kích thước trên R2 (${head.ContentLength}) khác file gốc (${body.length})`);
      uploaded++; bytes += body.length;
    }
    if (++done % 100 === 0) console.log(`  ${done}/${all.length}  (↑ ${uploaded}, = ${skipped})`);
  };

  const queue = [...rest];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { for (let f; (f = queue.shift()); ) await send(f); }));
  await send(index); // last

  if (!dryRun) {
    const r = await fetch(`${publicBase}/${prefix}index.json`, { cache: "no-store" });
    if (!r.ok) throw new Error(`URL công khai của index.json trả ${r.status}`);
    const j = (await r.json()) as { revision: string; skillCount: number };
    const c = await fetch(`${publicBase}/${prefix}catalog/${j.revision}.json`);
    if (!c.ok) throw new Error(`catalog ${j.revision} trả ${c.status}`);
    console.log(`kiểm tra công khai: revision ${j.revision}, ${j.skillCount} skill ✓`);
  }
  console.log(`xong: ${uploaded} ${dryRun ? "sẽ tải lên" : "tải lên"} (${(bytes / 1048576).toFixed(0)} MB), ${skipped} đã có sẵn`);
  console.log(`Feed URL: ${publicBase}/${prefix}index.json`);
}

main().catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exit(1); });
