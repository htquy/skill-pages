import { randomUUID } from "node:crypto";
import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
  type CompletedPart,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getR2Config } from "@/src/lib/env";
import { R2_PART_SIZE_BYTES } from "@/src/lib/validation";

const PRESIGN_EXPIRES_IN_SECONDS = 15 * 60;

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  const { accessKeyId, secretAccessKey, endpoint } = getR2Config();
  cachedClient = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
  return cachedClient;
}

const EXTENSION_BY_TYPE: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function slugifyFileName(fileName: string): string {
  const base = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();
  return base.slice(-80) || "file";
}

/** Phần mở rộng an toàn để đặt lại tên object, kể cả tệp nhị phân. */
function safeExtension(fileName: string): string | null {
  const match = /\.([A-Za-z0-9]{1,10})$/.exec(fileName.trim());
  if (!match) return null;
  return match[1].toLowerCase();
}

export function buildObjectKey(fileName: string, contentType: string, prefix = "skill-videos"): string {
  const date = new Date();
  const day = date.toISOString().slice(0, 10);
  const extension = EXTENSION_BY_TYPE[contentType] ?? safeExtension(fileName) ?? "bin";
  const safeName = slugifyFileName(fileName);
  const nameWithoutExtension = safeName.replace(/\.[a-z0-9]+$/i, "");
  return `${prefix}/${day}/${randomUUID()}-${nameWithoutExtension}.${extension}`;
}

export function publicUrlFor(key: string): string {
  const { publicUrl } = getR2Config();
  return `${publicUrl}/${key}`;
}

export async function createPresignedUploadUrl(input: {
  key: string;
  contentType: string;
}): Promise<{ url: string; publicUrl: string }> {
  const client = getClient();
  const { bucket } = getR2Config();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: input.key,
    ContentType: input.contentType,
  });
  const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRES_IN_SECONDS });
  return { url, publicUrl: publicUrlFor(input.key) };
}

export async function createMultipartUpload(input: {
  key: string;
  contentType: string;
}): Promise<{ uploadId: string }> {
  const client = getClient();
  const { bucket } = getR2Config();
  const result = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: input.key,
      ContentType: input.contentType,
    }),
  );
  if (!result.UploadId) throw new Error("R2 did not return an upload id");
  return { uploadId: result.UploadId };
}

export async function createPresignedPartUrls(input: {
  key: string;
  uploadId: string;
  partNumbers: number[];
}): Promise<{ partNumber: number; url: string }[]> {
  const client = getClient();
  const { bucket } = getR2Config();
  return Promise.all(
    input.partNumbers.map(async (partNumber) => {
      const command = new UploadPartCommand({
        Bucket: bucket,
        Key: input.key,
        UploadId: input.uploadId,
        PartNumber: partNumber,
      });
      const url = await getSignedUrl(client, command, { expiresIn: PRESIGN_EXPIRES_IN_SECONDS });
      return { partNumber, url };
    }),
  );
}

export async function completeMultipartUpload(input: {
  key: string;
  uploadId: string;
  parts: { partNumber: number; etag: string }[];
}): Promise<{ publicUrl: string }> {
  const client = getClient();
  const { bucket } = getR2Config();
  const parts: CompletedPart[] = input.parts
    .slice()
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((part) => ({ PartNumber: part.partNumber, ETag: part.etag }));
  await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: input.key,
      UploadId: input.uploadId,
      MultipartUpload: { Parts: parts },
    }),
  );
  return { publicUrl: publicUrlFor(input.key) };
}

export async function abortMultipartUpload(input: { key: string; uploadId: string }): Promise<void> {
  const client = getClient();
  const { bucket } = getR2Config();
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: input.key,
      UploadId: input.uploadId,
    }),
  );
}

export function partCountFor(size: number): number {
  return Math.max(1, Math.ceil(size / R2_PART_SIZE_BYTES));
}
