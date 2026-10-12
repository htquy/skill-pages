import { OAuthController } from "@/src/server/controllers/oauth.controller";

export async function POST(request: Request) {
  return OAuthController.handleToken(request);
}

export async function OPTIONS() {
  return OAuthController.handleOptions();
}
