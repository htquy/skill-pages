import { AiAdminController } from "@/src/server/controllers/ai-admin.controller";

export async function GET(): Promise<Response> {
  return AiAdminController.listKeys();
}

export async function POST(request: Request): Promise<Response> {
  return AiAdminController.createKey(request);
}
