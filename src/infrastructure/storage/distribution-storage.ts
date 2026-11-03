import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getOptionalEnv, getR2Config } from "@/src/lib/env";
import { ValidationError } from "@/src/domain/errors";
import { parseGitHubReleaseUrl } from "@/src/domain/apps/distribution";

function target(url: string) {
  const config = getR2Config();
  const base = new URL(config.publicUrl + "/"), value = new URL(url);
  if (value.protocol !== "https:" || value.origin !== base.origin || !value.pathname.startsWith(base.pathname) || value.search || value.hash)
    throw new ValidationError("URL phải thuộc Cloudflare R2 đã cấu hình hoặc là asset GitHub Release");
  const key = decodeURIComponent(value.pathname.slice(base.pathname.length));
  if (!/^(app-sources|tools|tool-files)\//.test(key) || key.split("/").some(p => p === ".." || p === "."))
    throw new ValidationError("Object phải nằm trong app-sources/, tools/ hoặc tool-files/");
  const client = new S3Client({ region: "auto", endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return { client, Bucket: config.bucket, Key: key };
}
/** Asset public của GitHub Release: kiểm tra qua GitHub API (dung lượng + digest SHA-256 nếu GitHub có). */
async function verifyGitHub(release: NonNullable<ReturnType<typeof parseGitHubReleaseUrl>>, size: number, sha256: string) {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "skill-pages-distribution", "X-GitHub-Api-Version": "2022-11-28" };
  const token = getOptionalEnv("GITHUB_TOKEN");
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com/repos/${encodeURIComponent(release.owner)}/${encodeURIComponent(release.repo)}/releases/tags/${encodeURIComponent(release.tag)}`,
    { headers, cache: "no-store", signal: AbortSignal.timeout(15_000) });
  if (response.status === 404) throw new ValidationError("Không tìm thấy GitHub Release public cho tag này");
  if (!response.ok) throw new ValidationError(`GitHub API trả về HTTP ${response.status}; thử lại sau hoặc cấu hình GITHUB_TOKEN`);
  const data = await response.json() as { assets?: { name: string; size: number; state: string; digest?: string | null }[] };
  const asset = data.assets?.find(a => a.name === release.asset);
  if (!asset || asset.state !== "uploaded") throw new ValidationError(`Release ${release.tag} không có file ${release.asset}`);
  if (asset.size !== size) throw new ValidationError("Dung lượng file trên GitHub không khớp");
  if (asset.digest?.startsWith("sha256:") && asset.digest.slice(7).toLowerCase() !== sha256.toLowerCase())
    throw new ValidationError("SHA-256 không khớp với digest GitHub");
}
export const distributionStorage = {
  async verify(url: string, size: number, sha256: string) {
    const release = parseGitHubReleaseUrl(url);
    if (release) return verifyGitHub(release, size, sha256);
    const { client, ...input } = target(url);
    try {
      const head = await client.send(new HeadObjectCommand(input));
      if (head.ContentLength !== size) throw new ValidationError("Dung lượng file trên R2 không khớp");
    } finally { client.destroy(); }
  },
  async remove(url: string) {
    const { client, ...input } = target(url);
    try { await client.send(new DeleteObjectCommand(input)); } finally { client.destroy(); }
  },
};
