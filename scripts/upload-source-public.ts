/**
 * Uploads a "source-public" folder (files + .sha256 + .release.json + manifest.json) to R2 under a prefix.
 *
 *   npx tsx --env-file=.env scripts/upload-source-public.ts --dir ../../VideoToolSkill/source-public [--prefix tools/] [--dry-run]
 *
 * - Needs R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL (as the app). Never prints them.
 * - Skips an object that already exists with the same size and sha256 (stored as object metadata), so re-runs are cheap.
 * - Every uploaded file is verified afterwards (HEAD size + a ranged GET of the first bytes through the public URL).
 * - manifest.json goes LAST: clients only switch to the new catalog once everything it names is in place.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const dir = resolve(arg("dir") ?? "./source-public");
const prefix = (arg("prefix") ?? "tools/").replace(/^\/+/, "").replace(/\/?$/, "/");
const dryRun = process.argv.includes("--dry-run");
for (const v of ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"])
  if (!process.env[v]) throw new Error(`Thiếu ${v}`);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID!, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY! },
});
const bucket = process.env.R2_BUCKET_NAME!;
const publicBase = process.env.R2_PUBLIC_URL!.replace(/\/+$/, "");

const TYPES: Record<string, string> = { exe: "application/octet-stream", zip: "application/zip", json: "application/json", sha256: "text/plain; charset=utf-8", bin: "application/octet-stream" };
const typeOf = (f: string) => TYPES[f.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";

async function main() {
  const files = readdirSync(dir).filter((f) => statSync(join(dir, f)).isFile());
  if (!files.includes("manifest.json")) throw new Error("source-public không có manifest.json");
  // binaries and sidecars first, manifest last
  const ordered = [...files.filter((f) => f !== "manifest.json").sort((a, b) => statSync(join(dir, a)).size - statSync(join(dir, b)).size), "manifest.json"];
  console.log(`${dryRun ? "[dry-run] " : ""}${ordered.length} file → ${publicBase}/${prefix}`);
  let uploaded = 0, skipped = 0, bytes = 0;
  for (const f of ordered) {
    const path = join(dir, f);
    const body = readFileSync(path);
    const sha = createHash("sha256").update(body).digest("hex");
    const key = prefix + f;
    let same = false;
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      same = head.ContentLength === body.length && head.Metadata?.sha256 === sha;
    } catch { /* not there yet */ }
    if (same) { skipped++; console.log(`= ${f}`); continue; }
    if (dryRun) { console.log(`↑ would upload ${f} (${(body.length / 1048576).toFixed(1)} MB)`); continue; }
    await s3.send(new PutObjectCommand({
      Bucket: bucket, Key: key, Body: body, ContentType: typeOf(f), Metadata: { sha256: sha },
      // versioned names never change; fixed names and the manifest must not be cached for long (clients verify sha anyway)
      CacheControl: f === "manifest.json" ? "no-cache" : /\d+\.\d+\.\d+/.test(f) ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    }));
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (head.ContentLength !== body.length) throw new Error(`${f}: kích thước trên R2 (${head.ContentLength}) khác file gốc (${body.length})`);
    const r = await fetch(`${publicBase}/${key}`, { headers: { Range: "bytes=0-15" } });
    if (r.status !== 206 && r.status !== 200) throw new Error(`${f}: URL công khai trả ${r.status}`);
    uploaded++; bytes += body.length;
    console.log(`↑ ${f} (${(body.length / 1048576).toFixed(1)} MB) ✓`);
  }
  console.log(`xong: ${uploaded} tải lên (${(bytes / 1048576).toFixed(0)} MB), ${skipped} đã có sẵn`);
}

main().catch((e) => { console.error("Lỗi:", e instanceof Error ? e.message : e); process.exit(1); });
