import { AiAdminController } from "@/src/server/controllers/ai-admin.controller";

export async function GET(request: Request): Promise<Response> {
  return AiAdminController.listPolicies(request);
}

export async function PUT(request: Request): Promise<Response> {
  return AiAdminController.upsertPolicy(request);
}
