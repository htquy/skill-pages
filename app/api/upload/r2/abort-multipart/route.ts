import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { isAppError } from "@/src/domain/errors";
import { isR2Configured } from "@/src/lib/env";
import { r2MultipartAbortSchema } from "@/src/lib/validation";
import { abortMultipartUpload } from "@/src/infrastructure/storage/r2";

export const runtime = "nodejs";

/** Dọn multipart upload khi người dùng huỷ giữa chừng để không tốn storage. */
export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (!isR2Configured()) {
      return NextResponse.json({ error: "Storage is not configured" }, { status: 503 });
    }

    const body: unknown = await request.json().catch(() => null);
    const parsed = r2MultipartAbortSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid upload input" }, { status: 400 });
    }

    await abortMultipartUpload({ key: parsed.data.key, uploadId: parsed.data.uploadId });
    return NextResponse.json({ aborted: true });
  } catch (error) {
    if (isAppError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[r2-multipart-abort] unhandled failure", error);
    return NextResponse.json({ error: "Unable to cancel the upload" }, { status: 500 });
  }
}
