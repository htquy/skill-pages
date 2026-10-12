import { UploadController } from "@/src/server/controllers/upload.controller";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return UploadController.completeMultipart(request);
}
