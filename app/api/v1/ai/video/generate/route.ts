import { AiGatewayController } from "@/src/server/controllers/ai-gateway.controller";

export async function POST(request: Request) {
  return AiGatewayController.generateVideo(request);
}
