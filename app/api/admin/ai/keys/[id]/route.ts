import { AiAdminController } from "@/src/server/controllers/ai-admin.controller";

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return AiAdminController.updateKey(request, id);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return AiAdminController.deleteKey(request, id);
}
