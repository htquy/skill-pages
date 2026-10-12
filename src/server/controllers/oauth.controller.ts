import { NextResponse } from "next/server";
import { oauthService } from "@/src/infrastructure/composition";
import { auth } from "@/src/infrastructure/authentication/auth";
import { requireAdmin } from "@/src/infrastructure/authentication/authorization";
import { siteConfig } from "@/src/lib/site";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseBasicAuth(header: string | null): { clientId: string; clientSecret: string } | null {
  if (!header || !header.startsWith("Basic ")) return null;
  try {
    const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    if (separator < 0) return null;
    return {
      clientId: decodeURIComponent(decoded.slice(0, separator)),
      clientSecret: decodeURIComponent(decoded.slice(separator + 1)),
    };
  } catch {
    return null;
  }
}

export const oauthCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
} as const;

export class OAuthController {
  /**
   * CORS Preflight OPTIONS handler
   */
  static handleOptions(): NextResponse {
    return new NextResponse(null, {
      status: 204,
      headers: oauthCorsHeaders,
    });
  }

  /**
   * RFC 6749 / RFC 7636 Authorization Endpoint.
   *
   * GET /api/auth/oauth/authorize
   * - Chưa có `decision`: hiển thị trang xác nhận (consent) để người dùng đồng ý.
   * - `decision=allow`: phát hành authorization code và redirect về client.
   * - `decision=deny`: redirect về client kèm `error=access_denied`.
   */
  static async handleAuthorize(request: Request): Promise<NextResponse> {
    try {
      const url = new URL(request.url);
      const clientId = url.searchParams.get("client_id");
      const redirectUri = url.searchParams.get("redirect_uri");
      const responseType = url.searchParams.get("response_type");
      const scope = url.searchParams.get("scope") ?? "openid profile email";
      const state = url.searchParams.get("state") ?? "";
      const codeChallenge = url.searchParams.get("code_challenge");
      const codeChallengeMethod = url.searchParams.get("code_challenge_method") ?? "S256";
      const decision = url.searchParams.get("decision");

      if (!clientId || !redirectUri) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "client_id and redirect_uri are required" },
          { status: 400 },
        );
      }

      if (responseType !== "code") {
        return NextResponse.json(
          { error: "unsupported_response_type", error_description: "Only response_type=code is supported" },
          { status: 400 },
        );
      }

      // Bắt buộc PKCE theo RFC 7636 và chỉ chấp nhận S256 (khuyến nghị bảo mật).
      if (!codeChallenge) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "PKCE code_challenge is required" },
          { status: 400 },
        );
      }
      if (codeChallengeMethod !== "S256") {
        return NextResponse.json(
          { error: "invalid_request", error_description: "Only code_challenge_method=S256 is supported" },
          { status: 400 },
        );
      }

      const client = await oauthService.validateClient(clientId, redirectUri);

      // Kiểm tra phiên đăng nhập; chưa đăng nhập thì đưa về trang login rồi quay lại.
      const session = await auth();
      if (!session || !session.user || !session.user.id) {
        const loginUrl = new URL("/login", siteConfig.url || url.origin);
        loginUrl.searchParams.set("callbackUrl", request.url);
        return NextResponse.redirect(loginUrl.toString(), 302);
      }

      if (decision === "deny") {
        const deniedUrl = new URL(redirectUri);
        deniedUrl.searchParams.set("error", "access_denied");
        deniedUrl.searchParams.set("error_description", "The user denied the authorization request");
        if (state) deniedUrl.searchParams.set("state", state);
        return NextResponse.redirect(deniedUrl.toString(), 302);
      }

      if (decision !== "allow") {
        return this.renderConsentPage({
          clientName: client.name,
          scopes: scope.split(" ").filter(Boolean),
          params: {
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: responseType,
            scope,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
          },
        });
      }

      const { code } = await oauthService.createAuthorizationCode({
        clientId,
        userId: session.user.id,
        redirectUri,
        scope,
        codeChallenge,
        codeChallengeMethod: "S256",
      });

      const targetUrl = new URL(redirectUri);
      targetUrl.searchParams.set("code", code);
      if (state) targetUrl.searchParams.set("state", state);

      return NextResponse.redirect(targetUrl.toString(), 302);
    } catch (error: unknown) {
      return NextResponse.json(
        { error: "invalid_request", error_description: getErrorMessage(error) || "Failed to process authorization" },
        { status: 400 },
      );
    }
  }

  private static renderConsentPage(input: {
    clientName: string;
    scopes: string[];
    params: Record<string, string>;
  }): NextResponse {
    const hiddenFields = Object.entries(input.params)
      .map(
        ([key, value]) =>
          `<input type="hidden" name="${escapeHtml(key)}" value="${escapeHtml(value)}" />`,
      )
      .join("\n        ");
    const scopeList = input.scopes.length
      ? input.scopes.map((s) => `<li><code>${escapeHtml(s)}</code></li>`).join("")
      : "<li><code>openid</code></li>";

    const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Xác nhận ủy quyền | ${escapeHtml(siteConfig.name)}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #0f172a; color: #e2e8f0; }
    .card { background: #1e293b; padding: 2rem; border-radius: 16px; max-width: 26rem; width: calc(100% - 2rem); box-shadow: 0 20px 45px rgba(0,0,0,.45); }
    h1 { font-size: 1.25rem; margin: 0 0 .5rem; }
    p { color: #94a3b8; line-height: 1.5; }
    ul { color: #cbd5e1; }
    .actions { display: flex; gap: .75rem; margin-top: 1.5rem; }
    button { flex: 1; padding: .75rem 1rem; border-radius: 10px; border: 0; font-weight: 600; cursor: pointer; font-size: .95rem; }
    .allow { background: #6366f1; color: white; }
    .deny { background: transparent; color: #cbd5e1; border: 1px solid #475569; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Ủy quyền cho ${escapeHtml(input.clientName)}</h1>
    <p>Ứng dụng <strong>${escapeHtml(input.clientName)}</strong> yêu cầu truy cập tài khoản của bạn với các quyền sau:</p>
    <ul>${scopeList}</ul>
    <form method="get" action="/api/auth/oauth/authorize">
        ${hiddenFields}
      <div class="actions">
        <button class="deny" type="submit" name="decision" value="deny">Từ chối</button>
        <button class="allow" type="submit" name="decision" value="allow">Đồng ý</button>
      </div>
    </form>
  </div>
</body>
</html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'",
      },
    });
  }

  /**
   * RFC 6749 / RFC 7636 Token Endpoint.
   * POST /api/auth/oauth/token
   */
  static async handleToken(request: Request): Promise<NextResponse> {
    try {
      const contentType = request.headers.get("content-type") || "";
      let body: Record<string, string> = {};

      if (contentType.includes("application/json")) {
        body = (await request.json()) as Record<string, string>;
      } else {
        const text = await request.text();
        new URLSearchParams(text).forEach((value, key) => {
          body[key] = value;
        });
      }

      // Hỗ trợ xác thực client qua HTTP Basic (client_secret_basic).
      const basic = parseBasicAuth(request.headers.get("authorization"));
      if (basic) {
        body.client_id = body.client_id || basic.clientId;
        body.client_secret = body.client_secret || basic.clientSecret;
      }

      const grantType = body.grant_type;
      const clientId = body.client_id;

      if (!grantType || !clientId) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "grant_type and client_id are required" },
          { status: 400 },
        );
      }

      const tokenHeaders = { "Cache-Control": "no-store", Pragma: "no-cache", ...oauthCorsHeaders } as const;

      if (grantType === "authorization_code") {
        const { code, redirect_uri: redirectUri, code_verifier: codeVerifier, client_secret: clientSecret } = body;

        if (!code || !redirectUri || !codeVerifier) {
          return NextResponse.json(
            { error: "invalid_request", error_description: "code, redirect_uri, and code_verifier are required" },
            { status: 400, headers: oauthCorsHeaders },
          );
        }

        const tokenData = await oauthService.exchangeToken({
          clientId,
          code,
          redirectUri,
          codeVerifier,
          clientSecret,
        });

        return NextResponse.json(tokenData, { status: 200, headers: tokenHeaders });
      }

      if (grantType === "refresh_token") {
        if (!body.refresh_token) {
          return NextResponse.json(
            { error: "invalid_request", error_description: "refresh_token is required" },
            { status: 400, headers: oauthCorsHeaders },
          );
        }

        const tokenData = await oauthService.refreshToken({
          clientId,
          refreshToken: body.refresh_token,
          scope: body.scope,
          clientSecret: body.client_secret,
        });

        return NextResponse.json(tokenData, { status: 200, headers: tokenHeaders });
      }

      return NextResponse.json(
        { error: "unsupported_grant_type", error_description: `Grant type '${grantType}' not supported` },
        { status: 400, headers: oauthCorsHeaders },
      );
    } catch (error: unknown) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: getErrorMessage(error) || "Token exchange failed" },
        { status: 400, headers: oauthCorsHeaders },
      );
    }
  }

  /**
   * OpenID Connect UserInfo Endpoint.
   * GET / POST /api/auth/oauth/userinfo
   */
  static async handleUserInfo(request: Request): Promise<NextResponse> {
    try {
      const authHeader = request.headers.get("authorization") || "";
      if (!authHeader.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "invalid_token", error_description: "Bearer access token required" },
          { status: 401, headers: oauthCorsHeaders },
        );
      }

      const token = authHeader.substring(7).trim();
      const user = await oauthService.getUserByAccessToken(token);
      const scopes = new Set(user.scopes);

      return NextResponse.json(
        {
          sub: user.id,
          ...(scopes.has("profile") ? { id: user.id, name: user.name, picture: user.image } : {}),
          ...(scopes.has("email") ? { email: user.email, email_verified: false } : {}),
          role: user.role,
          status: user.status,
        },
        { headers: oauthCorsHeaders },
      );
    } catch (error: unknown) {
      return NextResponse.json(
        { error: "invalid_token", error_description: getErrorMessage(error) || "Invalid access token" },
        { status: 401, headers: oauthCorsHeaders },
      );
    }
  }

  /**
   * RFC 7009 Token Revocation Endpoint.
   * POST /api/auth/oauth/revoke
   */
  static async handleRevoke(request: Request): Promise<NextResponse> {
    try {
      let token = "";
      const contentType = request.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as { token?: string };
        token = body.token ?? "";
      } else {
        token = new URLSearchParams(await request.text()).get("token") || "";
      }

      if (token) {
        await oauthService.revokeToken(token);
      }

      return new NextResponse(null, { status: 200 });
    } catch (error: unknown) {
      return NextResponse.json({ error: "server_error", error_description: getErrorMessage(error) }, { status: 500 });
    }
  }

  /**
   * OAuth 2.0 Authorization Server Metadata (RFC 8414).
   * GET /api/auth/oauth/.well-known/openid-configuration
   */
  static async handleDiscovery(request: Request): Promise<NextResponse> {
    const url = new URL(request.url);
    const origin = siteConfig.url || url.origin;
    // Issuer = gốc OAuth; discovery chuẩn nằm tại <issuer>/.well-known/openid-configuration.
    const issuer = `${origin}/api/auth/oauth`;

    return NextResponse.json(
      {
        issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        userinfo_endpoint: `${issuer}/userinfo`,
        revocation_endpoint: `${issuer}/revoke`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code", "refresh_token"],
        subject_types_supported: ["public"],
        token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
        revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
        code_challenge_methods_supported: ["S256"],
        scopes_supported: ["openid", "profile", "email"],
      },
      { headers: { "Cache-Control": "public, max-age=3600" } },
    );
  }

  /**
   * Client Registration / Management (admin only).
   * POST /api/auth/oauth/clients
   */
  static async handleRegisterClient(request: Request): Promise<NextResponse> {
    try {
      await requireAdmin();
      const body = (await request.json()) as {
        name?: string;
        clientId?: string;
        clientSecret?: string;
        redirectUris?: string[] | string;
        scopes?: string[] | string;
        isPublic?: boolean;
      };
      const { name, clientId, clientSecret, redirectUris, scopes, isPublic } = body;

      if (!name || !clientId || !redirectUris) {
        return NextResponse.json(
          { error: "invalid_request", error_description: "name, clientId, and redirectUris are required" },
          { status: 400 },
        );
      }

      const client = await oauthService.registerClient({
        name,
        clientId,
        clientSecret,
        redirectUris: Array.isArray(redirectUris) ? redirectUris : [redirectUris],
        scopes: Array.isArray(scopes) ? scopes : ["openid", "profile", "email"],
        isPublic: isPublic ?? true,
      });

      return NextResponse.json({ data: client }, { status: 201 });
    } catch (error: unknown) {
      const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status: unknown }).status) : 400;
      return NextResponse.json({ error: getErrorMessage(error) }, { status: Number.isFinite(status) ? status : 400 });
    }
  }
}
