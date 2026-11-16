import { AiGatewayController } from "@/src/server/controllers/ai-gateway.controller";

export async function GET(request: Request): Promise<Response> {
  return AiGatewayController.getCredits(request);
}
