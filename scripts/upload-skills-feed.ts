/**
 * Uploads the SkillStudio skill feed (output of `skillstudio skills pack skills r2-skills --bundles`) to R2. INCREMENTAL.
 *
 *   npx tsx --env-file=.env scripts/upload-skills-feed.ts --dir ../../VideoToolSkill/r2-skills [--prefix skills-feed/] [--dry-run] [--prune]
 *
 * You never delete or re-upload the library when you add a style: run this again and only what changed is sent.
 *
 * - Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL. Never prints them.
 * - ONE ListObjectsV2 pass (1 request per 1000 objects) replaces thousands of HEAD requests: an object that is missing or has a
 *   different size is uploaded; an object with the same size is skipped when the local ledger (<dir>/.upload-ledger.json: key ->
 *   size, mtime, sha256 of what was uploaded) says the file did not change, otherwise it is hashed and compared to the object's
 *   sha256 metadata (HEAD) before deciding. Names under catalog/ and bundles/ contain their hash, so exists-with-same-size is enough.
 * - index.json goes LAST: clients only switch to the new revision once catalog/, bundles/ and skills/ are all in place.
 * - Before index.json the bucket is listed again and every local file must be there with the right size ("đủ n/n"), or the script fails.
 * - --prune removes objects under the prefix that are no longer in the feed (deleted skills, old catalogs/bundles). Off by default.
 * - Cache: index.json no-cache; everything else immutable (the app asks with ?v=<sha>, bundles/catalog are named by hash).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const dir = resolve(arg("dir") ?? "./r2-skills");
const prefix = (arg("prefix") ?? "skills-feed/").replace(/^\/+/, "").replace(/\/?$/, "/");
const dryRun = process.argv.includes("--dry-run");
const prune = process.argv.includes("--prune");
const CONCURRENCY = 16;
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

async function listRemote(): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  let token: string | undefined;
  do {
    const r = await retry(() => s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token })));
    for (const o of r.Contents ?? []) m.set(o.Key!, o.Size ?? 0);
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return m;
}

type Ledger = Record<string, { size: number; mtime: number; sha: string }>;
type Local = { path: string; key: string; size: number; mtime: number };

async function main() {
  const ledgerPath = join(dir, ".upload-ledger.json");
  let ledger: Ledger = {};
  try { if (existsSync(ledgerPath)) ledger = JSON.parse(readFileSync(ledgerPath, "utf8")); } catch { ledger = {}; }

  const all: Local[] = walk(dir)
    .map((p) => { const st = statSync(p); return { path: p, key: prefix + relative(dir, p).split(sep).join("/"), size: st.size, mtime: Math.floor(st.mtimeMs) }; })
    .filter((f) => !f.key.endsWith("/README.md") && !f.key.endsWith("/.upload-ledger.json") && !f.key.endsWith(".tmp"));
  const index = all.find((f) => f.key === prefix + "index.json");
  if (!index) throw new Error("r2-skills không có index.json");
  const rest = all.filter((f) => f !== index);

  const remote = await listRemote();
  console.log(`${dryRun ? "[dry-run] " : ""}${all.length} file cục bộ, ${remote.size} object trên R2 → ${publicBase}/${prefix}`);

  let uploaded = 0, skipped = 0, bytes = 0, done = 0;
  const hashed = (f: Local) => createHash("sha256").update(readFileSync(f.path)).digest("hex");
  const immutableName = (k: string) => k.startsWith(prefix + "catalog/") || k.startsWith(prefix + "bundles/");
  const sameOnRemote = async (f: Local, sha: string) => {
    try { return (await retry(() => s3.send(new HeadObjectCommand({ Bucket: bucket, Key: f.key })))).Metadata?.sha256 === sha; }
    catch { return false; }
  };

  const send = async (f: Local) => {
    let same = remote.get(f.key) === f.size; // a different size is certainly a different file
    let sha: string | undefined;
    if (same && !immutableName(f.key)) {
      const l = ledger[f.key];
      if (f.key !== prefix + "index.json" && l && l.size === f.size && l.mtime === f.mtime) sha = l.sha; // unchanged since our last upload: no read at all
      else { sha = hashed(f); same = await sameOnRemote(f, sha); }
    }
    if (same) { skipped++; if (sha) ledger[f.key] = { size: f.size, mtime: f.mtime, sha }; }
    else if (dryRun) { uploaded++; bytes += f.size; }
    else {
      const body = readFileSync(f.path);
      const digest = sha ?? createHash("sha256").update(body).digest("hex");
      await retry(() => s3.send(new PutObjectCommand({
        Bucket: bucket, Key: f.key, Body: body, ContentType: typeOf(f.key), Metadata: { sha256: digest },
        CacheControl: f.key === prefix + "index.json" ? "no-cache" : "public, max-age=31536000, immutable",
      })));
      remote.set(f.key, f.size);
      ledger[f.key] = { size: f.size, mtime: f.mtime, sha: digest };
      uploaded++; bytes += f.size;
    }
    if (++done % 250 === 0) console.log(`  ${done}/${all.length}  (↑ ${uploaded}, = ${skipped})`);
  };

  const saveLedger = () => { if (!dryRun) writeFileSync(ledgerPath, JSON.stringify(ledger)); };
  // big files first (bundles, videos): the long transfers overlap with the many small ones
  const queue = [...rest].sort((a, b) => b.size - a.size);
  try {
    await Promise.all(Array.from({ length: CONCURRENCY }, async () => { for (let f; (f = queue.shift()); ) await send(f); }));
  } finally { saveLedger(); }

  // completeness: everything we have must be in the bucket with the right size before index.json flips clients over
  if (!dryRun) {
    const check = await listRemote();
    const missing = rest.filter((f) => check.get(f.key) !== f.size);
    if (missing.length) throw new Error(`${missing.length} file chưa lên R2 đủ (ví dụ ${missing.slice(0, 3).map((f) => f.key).join(", ")}); chạy lại script`);
    console.log(`đủ ${rest.length}/${rest.length} file (catalog + bundles + skills) trên R2`);
  }
  await send(index); // last
  saveLedger();

  if (!dryRun) {
    const r = await fetch(`${publicBase}/${prefix}index.json`, { cache: "no-store" });
    if (!r.ok) throw new Error(`URL công khai của index.json trả ${r.status}`);
    const j = (await r.json()) as { revision: string; skillCount: number; bundles?: { name: string }[] };
    const c = await fetch(`${publicBase}/${prefix}catalog/${j.revision}.json`);
    if (!c.ok) throw new Error(`catalog ${j.revision} trả ${c.status}`);
    for (const b of j.bundles ?? []) {
      const h = await fetch(`${publicBase}/${prefix}${b.name}`, { method: "HEAD" });
      if (!h.ok) throw new Error(`bundle ${b.name} trả ${h.status}`);
    }
    console.log(`kiểm tra công khai: revision ${j.revision}, ${j.skillCount} skill, ${(j.bundles ?? []).length} bundle ✓`);
  }

  // objects that are no longer part of the feed (old catalogs, replaced bundles, deleted skills)
  const keep = new Set(all.map((f) => f.key));
  const orphans = [...remote.keys()].filter((k) => !keep.has(k));
  if (orphans.length) {
    if (prune && !dryRun) {
      for (let i = 0; i < orphans.length; i += 1000)
        await retry(() => s3.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: orphans.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } })));
      console.log(`đã xoá ${orphans.length} object cũ không còn trong feed`);
    } else console.log(`${orphans.length} object cũ không còn trong feed (thêm --prune để xoá; để lại cũng không sao, app chỉ đọc catalog mới)`);
  }

  console.log(`xong: ${uploaded} ${dryRun ? "sẽ tải lên" : "tải lên"} (${(bytes / 1048576).toFixed(0)} MB), ${skipped} đã có sẵn`);
  console.log(`Feed URL: ${publicBase}/${prefix}index.json`);
}

main().catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exit(1); });
