import { OAuthController } from "@/src/server/controllers/oauth.controller";

export async function GET(request: Request) {
  return OAuthController.handleAuthorize(request);
}
