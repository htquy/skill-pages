import { AiAdminController } from "@/src/server/controllers/ai-admin.controller";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  return AiAdminController.deletePolicy(request, id);
}
