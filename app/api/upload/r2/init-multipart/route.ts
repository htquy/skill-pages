import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";
import { isR2Configured } from "@/src/lib/env";
import { R2_PART_SIZE_BYTES, R2_UPLOAD_PREFIXES, r2MultipartInitSchema } from "@/src/lib/validation";
import {
  buildObjectKey,
  createMultipartUpload,
  createPresignedPartUrls,
  partCountFor,
  publicUrlFor,
} from "@/src/infrastructure/storage/r2";

export const runtime = "nodejs";

/** Upload nhiều phần cho file lớn (>= 50MB): cấp URL có chữ ký cho từng part. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!isR2Configured()) {
      return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = r2MultipartInitSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "invalid-input";
      return NextResponse.json(
        { error: message === "unsupported-content-type" ? "Unsupported file type" : "Invalid upload input" },
        { status: message === "unsupported-content-type" ? 415 : 400 },
      );
    }

    const partNumbers = Array.from({ length: partCountFor(parsed.data.size) }, (_, index) => index + 1);
    const key = buildObjectKey(
      parsed.data.fileName,
      parsed.data.contentType,
      R2_UPLOAD_PREFIXES[parsed.data.kind],
    );
    const { uploadId } = await createMultipartUpload({ key, contentType: parsed.data.contentType });
    const parts = await createPresignedPartUrls({ key, uploadId, partNumbers });

    return NextResponse.json({ key, uploadId, partSize: R2_PART_SIZE_BYTES, publicUrl: publicUrlFor(key), parts });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[r2-multipart-init] unhandled failure", error);
    return NextResponse.json({ error: "Unable to start the upload" }, { status: 500 });
  }
}
