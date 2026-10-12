import { OAuthController } from "@/src/server/controllers/oauth.controller";

export async function GET(request: Request) {
  return OAuthController.handleUserInfo(request);
}

export async function POST(request: Request) {
  return OAuthController.handleUserInfo(request);
}

export async function OPTIONS() {
  return OAuthController.handleOptions();
}
