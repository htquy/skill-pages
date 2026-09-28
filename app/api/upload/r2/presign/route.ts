import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";
import { isR2Configured } from "@/src/lib/env";
import { R2_UPLOAD_PREFIXES, r2PresignSchema } from "@/src/lib/validation";
import { buildObjectKey, createPresignedUploadUrl } from "@/src/infrastructure/storage/r2";

export const runtime = "nodejs";

/** Upload 1 lần cho file nhỏ (< 50MB): trả URL PUT có chữ ký để browser tự gửi thẳng lên R2. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!isR2Configured()) {
      return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = r2PresignSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "invalid-input";
      return NextResponse.json(
        { error: message === "unsupported-content-type" ? "Unsupported file type" : "Invalid upload input" },
        { status: message === "unsupported-content-type" ? 415 : 400 },
      );
    }

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
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[r2-presign] unhandled failure", error);
    return NextResponse.json({ error: "Unable to prepare the upload" }, { status: 500 });
  }
}
