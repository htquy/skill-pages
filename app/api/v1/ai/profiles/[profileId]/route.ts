import { AiGatewayController } from "@/src/server/controllers/ai-gateway.controller";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ profileId: string }> },
) {
  const { profileId } = await params;
  return AiGatewayController.getProfile(request, profileId);
}
