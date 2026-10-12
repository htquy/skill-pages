import { AiAdminController } from "@/src/server/controllers/ai-admin.controller";

export async function GET(request: Request): Promise<Response> {
  return AiAdminController.listLogs(request);
}
