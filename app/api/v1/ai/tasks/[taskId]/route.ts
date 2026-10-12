import { AiGatewayController } from "@/src/server/controllers/ai-gateway.controller";

export async function GET(
  request: Request,
  context: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await context.params;
  return AiGatewayController.getTaskStatus(request, taskId);
}
