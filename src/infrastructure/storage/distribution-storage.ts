import { DeleteObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getR2Config } from "@/src/lib/env";
import { ValidationError } from "@/src/domain/errors";

function target(url: string) {
  const config = getR2Config();
  const base = new URL(config.publicUrl + "/"), value = new URL(url);
  if (value.protocol !== "https:" || value.origin !== base.origin || !value.pathname.startsWith(base.pathname) || value.search || value.hash)
    throw new ValidationError("URL phải thuộc Cloudflare R2 đã cấu hình");
  const key = decodeURIComponent(value.pathname.slice(base.pathname.length));
  if (!/^(app-sources|tools|tool-files)\//.test(key) || key.split("/").some(p => p === ".." || p === "."))
    throw new ValidationError("Object phải nằm trong app-sources/, tools/ hoặc tool-files/");
  const client = new S3Client({ region: "auto", endpoint: config.endpoint,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey } });
  return { client, Bucket: config.bucket, Key: key };
}
export const distributionStorage = {
  async verify(url: string, size: number) {
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
