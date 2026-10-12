import { AiAdminController } from "@/src/server/controllers/ai-admin.controller";

export async function POST(request: Request): Promise<Response> {
  return AiAdminController.testApi(request);
}
