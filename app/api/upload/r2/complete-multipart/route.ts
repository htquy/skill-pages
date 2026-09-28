import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";
import { isR2Configured } from "@/src/lib/env";
import { r2MultipartCompleteSchema } from "@/src/lib/validation";
import { completeMultipartUpload } from "@/src/infrastructure/storage/r2";

export const runtime = "nodejs";

/** Ghép các part đã tải xong thành một object R2 và trả về URL public. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!isR2Configured()) {
      return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = r2MultipartCompleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid upload input" }, { status: 400 });
    }

    const { publicUrl } = await completeMultipartUpload({
      key: parsed.data.key,
      uploadId: parsed.data.uploadId,
      parts: parsed.data.parts,
    });

    return NextResponse.json({ key: parsed.data.key, publicUrl });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[r2-multipart-complete] unhandled failure", error);
    return NextResponse.json({ error: "Unable to finish the upload" }, { status: 500 });
  }
}
