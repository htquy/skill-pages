import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { IMediaStorage } from "@/src/domain/ai/contracts";

export class S3MediaStorage implements IMediaStorage {
  private client: S3Client | null = null;
  private bucketName: string;
  private publicBaseUrl: string;

  constructor() {
    this.bucketName = process.env.AI_STORAGE_BUCKET || process.env.R2_BUCKET || "ai-media-assets";
    this.publicBaseUrl =
      process.env.AI_STORAGE_PUBLIC_URL ||
      process.env.R2_PUBLIC_URL ||
      "https://storage.gateway.dev";

    const endpoint = process.env.AI_STORAGE_ENDPOINT || process.env.R2_ENDPOINT;
    const accessKeyId = process.env.AI_STORAGE_ACCESS_KEY || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AI_STORAGE_SECRET_KEY || process.env.R2_SECRET_ACCESS_KEY;
    const region = process.env.AI_STORAGE_REGION || process.env.R2_REGION || "auto";

    if (accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      });
    }
  }

  async uploadBuffer(buffer: Buffer, key: string, contentType: string): Promise<string> {
    if (!this.client) {
      // Mock / Dev fallback: Trả về data url hoặc public mock url
      if (buffer.length < 500000) {
        return `data:${contentType};base64,${buffer.toString("base64")}`;
      }
      return `${this.publicBaseUrl}/${key}`;
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }),
    );

    return `${this.publicBaseUrl.replace(/\/$/, "")}/${key}`;
  }

  async uploadFromUrl(sourceUrl: string, destinationKey: string): Promise<string> {
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) {
        return sourceUrl; // Fallback directly to source url
      }
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      return await this.uploadBuffer(buffer, destinationKey, contentType);
    } catch {
      return sourceUrl;
    }
  }
}

export const s3MediaStorage = new S3MediaStorage();
