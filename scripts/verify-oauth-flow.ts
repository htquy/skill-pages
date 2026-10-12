/**
 * Mô phỏng nguyên vẹn luồng OAuth2 + PKCE mà VideoTool.NavtiveAOT thực hiện
 * qua HTTP với server đang chạy (http://localhost:3000):
 *   authorize(mint code, loopback redirect) → POST /api/auth/oauth/token → GET /userinfo
 *   → GET /api/apps/video-tool/check-access + /menus → refresh_token grant.
 */
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { createOAuthService } from "@/src/application/identity/oauth-service";
import { prismaOAuthRepository } from "@/src/infrastructure/repositories/prisma-oauth-repository";
import { prismaUserRepository } from "@/src/infrastructure/repositories/prisma-user-repository";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";

function base64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function main() {
  const explorer = await prisma.user.findUnique({ where: { email: "explorer@promptworks.app" } });
  if (!explorer) throw new Error("explorer user not found");
  console.log("user:", explorer.id, explorer.email);

  const oauthRepo = prismaOAuthRepository;
  const userRepo = prismaUserRepository;
  const oauth = createOAuthService({ oauth: oauthRepo, users: userRepo });

  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash("sha256").update(verifier).digest());
  const redirectUri = "http://127.0.0.1:53829/callback"; // loopback cổng bất kỳ

  // 1) Giống HĐ authorize (decision=allow) — tạo code qua service thật.
  const { code } = await oauth.createAuthorizationCode({
    clientId: "video-tool-desktop",
    userId: explorer.id,
    redirectUri,
    scope: "openid profile email",
    codeChallenge: challenge,
    codeChallengeMethod: "S256",
  });
  console.log("authorization code mới:", code);

  // 2) POST /api/auth/oauth/token (form-urlencoded đúng như app gửi).
  const tokenRes = await fetch(`${BASE}/api/auth/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: "video-tool-desktop",
      code,
      redirect_uri: redirectUri,
      code_verifier: verifier,
    }),
  });
  const tokenBody = await tokenRes.text();
  console.log("token endpoint:", tokenRes.status);
  if (!tokenRes.ok) {
    console.log("TOKEN FAIL:", tokenBody);
    return;
  }
  const token = JSON.parse(tokenBody);
  console.log("access_token:", token.access_token?.slice(0, 12) + "...", "| refresh_token:", token.refresh_token?.slice(0, 12) + "...", "| expires_in:", token.expires_in);

  // 3) GET /api/auth/oauth/userinfo
  const uiRes = await fetch(`${BASE}/api/auth/oauth/userinfo`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  console.log("userinfo:", uiRes.status, await uiRes.text());

  // 4) Entitlement qua hub
  const checkRes = await fetch(`${BASE}/api/apps/video-tool/check-access`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  console.log("check-access:", checkRes.status);
  const check = await checkRes.json();
  console.log("→ isPaid:", check.data?.isPaid, "| sub:", check.data?.subscription?.planName, "| menus:", check.data?.menus?.length);

  const menusRes = await fetch(`${BASE}/api/apps/video-tool/menus`, {
    headers: { authorization: `Bearer ${token.access_token}` },
  });
  console.log("menus:", menusRes.status, (await menusRes.text()).slice(0, 200));

  // 5) Refresh grant (xoay vòng)
  const refreshRes = await fetch(`${BASE}/api/auth/oauth/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: "video-tool-desktop",
      refresh_token: token.refresh_token,
    }),
  });
  const refreshBody = await refreshRes.text();
  console.log("refresh:", refreshRes.status, refreshBody.slice(0, 120));

  // 6) Revoke
  const revokeRes = await fetch(`${BASE}/api/auth/oauth/revoke`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token: token.access_token, client_id: "video-tool-desktop" }),
  });
  console.log("revoke:", revokeRes.status);
}

main()
  .catch((e) => {
    console.error("SCRIPT ERROR:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());