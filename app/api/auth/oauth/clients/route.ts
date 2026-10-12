import { OAuthController } from "@/src/server/controllers/oauth.controller";

export async function POST(request: Request) {
  return OAuthController.handleRegisterClient(request);
}
