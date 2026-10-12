import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";
import { isR2Configured } from "@/src/lib/env";
import {
  R2_PART_SIZE_BYTES,
  R2_UPLOAD_PREFIXES,
  r2MultipartAbortSchema,
  r2MultipartCompleteSchema,
  r2MultipartInitSchema,
  r2PresignSchema,
} from "@/src/lib/validation";
import {
  abortMultipartUpload,
  buildObjectKey,
  completeMultipartUpload,
  createMultipartUpload,
  createPresignedPartUrls,
  createPresignedUploadUrl,
  partCountFor,
  publicUrlFor,
} from "@/src/infrastructure/storage/r2";

/**
 * UploadController: cấp URL tải trực tiếp lên Cloudflare R2 (một lần hoặc multipart).
 * Toàn bộ xử lý HTTP/validation tập trung ở đây; route chỉ chuyển tiếp.
 */
export class UploadController {
  private static notConfigured(): NextResponse {
    return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
  }

  private static invalidInput(parsed: { error: { issues: Array<{ message?: string }> } }): NextResponse {
    const message = parsed.error.issues[0]?.message ?? "invalid-input";
    return NextResponse.json(
      { error: message === "unsupported-content-type" ? "Unsupported file type" : "Invalid upload input" },
      { status: message === "unsupported-content-type" ? 415 : 400 },
    );
  }

  /** POST /api/upload/r2/presign — file nhỏ (< 50MB): trả URL PUT có chữ ký. */
  static async presign(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      if (!isR2Configured()) return this.notConfigured();

      const parsed = r2PresignSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return this.invalidInput(parsed);

      const key = buildObjectKey(
        parsed.data.fileName,
        parsed.data.contentType,
        R2_UPLOAD_PREFIXES[parsed.data.kind],
      );
      const { url, publicUrl } = await createPresignedUploadUrl({
        key,
        contentType: parsed.data.contentType,
      });

      return NextResponse.json({ key, url, publicUrl, expiresIn: 900 });
    } catch (error) {
      return this.failure(error, "r2-presign", "Unable to prepare the upload");
    }
  }

  /** POST /api/upload/r2/init-multipart — file lớn (>= 50MB): cấp URL có chữ ký từng part. */
  static async initMultipart(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      if (!isR2Configured()) return this.notConfigured();

      const parsed = r2MultipartInitSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return this.invalidInput(parsed);

      const partNumbers = Array.from({ length: partCountFor(parsed.data.size) }, (_, index) => index + 1);
      const key = buildObjectKey(
        parsed.data.fileName,
        parsed.data.contentType,
        R2_UPLOAD_PREFIXES[parsed.data.kind],
      );
      const { uploadId } = await createMultipartUpload({ key, contentType: parsed.data.contentType });
      const parts = await createPresignedPartUrls({ key, uploadId, partNumbers });

      return NextResponse.json({
        key,
        uploadId,
        partSize: R2_PART_SIZE_BYTES,
        publicUrl: publicUrlFor(key),
        parts,
      });
    } catch (error) {
      return this.failure(error, "r2-multipart-init", "Unable to start the upload");
    }
  }

  /** POST /api/upload/r2/complete-multipart — ghép các part thành một object R2. */
  static async completeMultipart(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      if (!isR2Configured()) return this.notConfigured();

      const parsed = r2MultipartCompleteSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return this.invalidInput(parsed);

      const { publicUrl } = await completeMultipartUpload({
        key: parsed.data.key,
        uploadId: parsed.data.uploadId,
        parts: parsed.data.parts,
      });

      return NextResponse.json({ key: parsed.data.key, publicUrl });
    } catch (error) {
      return this.failure(error, "r2-multipart-complete", "Unable to finish the upload");
    }
  }

  /** POST /api/upload/r2/abort-multipart — dọn multipart khi người dùng huỷ giữa chừng. */
  static async abortMultipart(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      if (!isR2Configured()) return this.notConfigured();

      const parsed = r2MultipartAbortSchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return this.invalidInput(parsed);

      await abortMultipartUpload({ key: parsed.data.key, uploadId: parsed.data.uploadId });
      return NextResponse.json({ aborted: true });
    } catch (error) {
      return this.failure(error, "r2-multipart-abort", "Unable to cancel the upload");
    }
  }

  private static failure(error: unknown, tag: string, fallbackMessage: string): NextResponse {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(`[${tag}] unhandled failure`, error);
    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
  }
}
