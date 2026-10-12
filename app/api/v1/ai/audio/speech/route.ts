import { AiGatewayController } from "@/src/server/controllers/ai-gateway.controller";

export async function POST(request: Request): Promise<Response> {
  return AiGatewayController.synthesizeAudio(request);
}
