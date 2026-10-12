import {
  OAuthRepository,
  OAuthClientRecord,
} from "@/src/domain/identity/oauth";
import { UserRepository } from "@/src/domain/identity/entities";
import {
  generateAuthorizationCode,
  generateRandomToken,
  hashSha256,
  verifyCodeChallenge,
} from "@/src/application/identity/oauth-pkce";

export interface CreateAuthCodeInput {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope?: string;
  codeChallenge: string;
  /** RFC 7636 chỉ chấp nhận S256 cho luồng doanh nghiệp. */
  codeChallengeMethod: "S256";
}

export interface ExchangeTokenInput {
  clientId: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
  clientSecret?: string;
}

export interface RefreshTokenInput {
  clientId: string;
  refreshToken: string;
  scope?: string;
  clientSecret?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface OAuthService {
  findClient(clientId: string): Promise<OAuthClientRecord | null>;
  validateClient(clientId: string, redirectUri: string): Promise<OAuthClientRecord>;
  createAuthorizationCode(input: CreateAuthCodeInput): Promise<{ code: string; redirectUri: string }>;
  exchangeToken(input: ExchangeTokenInput): Promise<TokenResponse>;
  refreshToken(input: RefreshTokenInput): Promise<TokenResponse>;
  revokeToken(token: string): Promise<void>;
  getUserByAccessToken(token: string): Promise<{
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
    status: string;
    scopes: string[];
  }>;
  registerClient(data: {
    name: string;
    clientId: string;
    clientSecret?: string;
    redirectUris: string[];
    scopes: string[];
    isPublic?: boolean;
  }): Promise<OAuthClientRecord>;
}

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]" || hostname === "localhost";
}

/**
 * RFC 8252 §7.3: ứng dụng native mở một loopback server với cổng ngẫu nhiên,
 * nên authorization server phải chấp nhận mọi cổng trên redirect URI loopback
 * đã đăng ký (chỉ so khớp scheme + host + path).
 */
function isAllowedLoopbackRedirect(allowed: string[], requested: string): boolean {
  let req: URL;
  try {
    req = new URL(requested);
  } catch {
    return false;
  }
  if (req.protocol !== "http:" || !isLoopbackHostname(req.hostname)) {
    return false;
  }
  return allowed.some((uri) => {
    try {
      const candidate = new URL(uri);
      return (
        candidate.protocol === "http:" &&
        isLoopbackHostname(candidate.hostname) &&
        candidate.pathname === req.pathname
      );
    } catch {
      return false;
    }
  });
}

export function createOAuthService(deps: {
  oauth: OAuthRepository;
  users: UserRepository;
}): OAuthService {
  const { oauth, users } = deps;

  return {
    async findClient(clientId: string) {
      return oauth.findClientByClientId(clientId);
    },

    async validateClient(clientId: string, redirectUri: string) {
      const client = await oauth.findClientByClientId(clientId);
      if (!client || !client.isActive) {
        throw new Error("Invalid or inactive OAuth client");
      }
      if (
        client.redirectUris.length > 0 &&
        !client.redirectUris.includes(redirectUri) &&
        !(client.isPublic && isAllowedLoopbackRedirect(client.redirectUris, redirectUri))
      ) {
        throw new Error("Redirect URI is not allowed for this client");
      }
      return client;
    },

    async createAuthorizationCode(input: CreateAuthCodeInput) {
      const client = await this.validateClient(input.clientId, input.redirectUri);

      if (!input.codeChallenge) {
        throw new Error("PKCE code_challenge is required");
      }
      if (input.codeChallengeMethod !== "S256") {
        throw new Error("Invalid code_challenge_method, only S256 is supported");
      }

      const code = generateAuthorizationCode();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
      const requestedScopes = input.scope ? input.scope.split(" ").filter(Boolean) : ["openid", "profile", "email"];
      // Chỉ cấp các scope client được phép xin, tránh leo thang quyền.
      const allowedScopes = new Set(client.scopes.length > 0 ? client.scopes : ["openid", "profile", "email"]);
      const scopes = requestedScopes.filter((s) => allowedScopes.has(s));

      await oauth.createAuthorizationCode({
        code,
        clientId: input.clientId,
        userId: input.userId,
        redirectUri: input.redirectUri,
        scopes,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: input.codeChallengeMethod,
        expiresAt,
      });

      return { code, redirectUri: input.redirectUri };
    },

    async exchangeToken(input: ExchangeTokenInput): Promise<TokenResponse> {
      const client = await oauth.findClientByClientId(input.clientId);
      if (!client || !client.isActive) {
        throw new Error("Invalid or inactive OAuth client");
      }

      // Confidential clients require secret verification
      if (!client.isPublic) {
        if (!input.clientSecret) {
          throw new Error("client_secret is required for confidential clients");
        }
        const secretHash = hashSha256(input.clientSecret);
        if (client.clientSecretHash !== secretHash) {
          throw new Error("Invalid client_secret");
        }
      }

      const authCode = await oauth.findAuthorizationCode(input.code);
      if (!authCode) {
        throw new Error("Invalid authorization code");
      }
      if (authCode.clientId !== input.clientId) {
        throw new Error("Authorization code does not belong to client");
      }
      if (authCode.redirectUri !== input.redirectUri) {
        throw new Error("Redirect URI does not match authorization request");
      }
      if (authCode.consumedAt !== null) {
        throw new Error("Authorization code already used");
      }
      if (authCode.expiresAt.getTime() < Date.now()) {
        throw new Error("Authorization code has expired");
      }

      // PKCE verification
      if (!input.codeVerifier) {
        throw new Error("code_verifier is required for PKCE validation");
      }
      if (authCode.codeChallengeMethod !== "S256") {
        throw new Error("Unsupported PKCE code_challenge_method on authorization code");
      }

      const isValidPkce = verifyCodeChallenge(
        input.codeVerifier,
        authCode.codeChallenge,
        "S256",
      );
      if (!isValidPkce) {
        throw new Error("PKCE verification failed: invalid code_verifier");
      }

      // Mark code consumed
      await oauth.consumeAuthorizationCode(authCode.id);

      // Issue Access Token & Refresh Token
      const rawAccessToken = `at_${generateRandomToken(32)}`;
      const rawRefreshToken = `rt_${generateRandomToken(40)}`;

      const accessTokenHash = hashSha256(rawAccessToken);
      const refreshTokenHash = hashSha256(rawRefreshToken);

      const accessExpiresIn = 86400; // 24 hours (1 day)
      const accessExpiresAt = new Date(Date.now() + accessExpiresIn * 1000);
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const accessTokenRecord = await oauth.createAccessToken({
        tokenHash: accessTokenHash,
        clientId: client.clientId,
        userId: authCode.userId,
        scopes: authCode.scopes,
        expiresAt: accessExpiresAt,
      });

      await oauth.createRefreshToken({
        tokenHash: refreshTokenHash,
        clientId: client.clientId,
        userId: authCode.userId,
        accessTokenId: accessTokenRecord.id,
        scopes: authCode.scopes,
        expiresAt: refreshExpiresAt,
      });

      return {
        access_token: rawAccessToken,
        token_type: "Bearer",
        expires_in: accessExpiresIn,
        refresh_token: rawRefreshToken,
        scope: authCode.scopes.join(" "),
      };
    },

    async refreshToken(input: RefreshTokenInput): Promise<TokenResponse> {
      const client = await oauth.findClientByClientId(input.clientId);
      if (!client || !client.isActive) {
        throw new Error("Invalid or inactive OAuth client");
      }

      // Confidential clients must authenticate on the refresh grant as well.
      if (!client.isPublic) {
        if (!input.clientSecret) {
          throw new Error("client_secret is required for confidential clients");
        }
        if (client.clientSecretHash !== hashSha256(input.clientSecret)) {
          throw new Error("Invalid client_secret");
        }
      }

      const oldTokenHash = hashSha256(input.refreshToken);
      const existing = await oauth.findRefreshTokenByHash(oldTokenHash);
      if (!existing || existing.revokedAt !== null) {
        throw new Error("Invalid or revoked refresh token");
      }
      if (existing.clientId !== input.clientId) {
        throw new Error("Refresh token does not belong to client");
      }
      if (existing.expiresAt.getTime() < Date.now()) {
        throw new Error("Refresh token expired");
      }

      // Generate new tokens
      const rawAccessToken = `at_${generateRandomToken(32)}`;
      const rawRefreshToken = `rt_${generateRandomToken(40)}`;

      const accessTokenHash = hashSha256(rawAccessToken);
      const refreshTokenHash = hashSha256(rawRefreshToken);

      const accessExpiresIn = 86400;
      const accessExpiresAt = new Date(Date.now() + accessExpiresIn * 1000);
      const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const accessTokenRecord = await oauth.createAccessToken({
        tokenHash: accessTokenHash,
        clientId: client.clientId,
        userId: existing.userId,
        scopes: existing.scopes,
        expiresAt: accessExpiresAt,
      });

      const newRefreshTokenRecord = await oauth.createRefreshToken({
        tokenHash: refreshTokenHash,
        clientId: client.clientId,
        userId: existing.userId,
        accessTokenId: accessTokenRecord.id,
        scopes: existing.scopes,
        expiresAt: refreshExpiresAt,
      });

      // Rotate old refresh token
      await oauth.rotateRefreshToken(oldTokenHash, newRefreshTokenRecord.id);

      return {
        access_token: rawAccessToken,
        token_type: "Bearer",
        expires_in: accessExpiresIn,
        refresh_token: rawRefreshToken,
        scope: existing.scopes.join(" "),
      };
    },

    async revokeToken(token: string): Promise<void> {
      const tokenHash = hashSha256(token);
      await oauth.revokeAccessToken(tokenHash);
      await oauth.revokeRefreshToken(tokenHash);
    },

    async getUserByAccessToken(token: string) {
      const tokenHash = hashSha256(token);
      const record = await oauth.findAccessTokenByHash(tokenHash);
      if (!record || record.revokedAt !== null) {
        throw new Error("Invalid or revoked access token");
      }
      if (record.expiresAt.getTime() < Date.now()) {
        throw new Error("Access token expired");
      }

      const user = await users.findById(record.userId);
      if (!user) {
        throw new Error("User associated with token not found");
      }
      if (user.status === "BLOCKED") {
        throw new Error("User account is blocked");
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        status: user.status,
        scopes: record.scopes,
      };
    },

    async registerClient(data) {
      const secretHash = data.clientSecret ? hashSha256(data.clientSecret) : null;
      return oauth.createClient({
        name: data.name,
        clientId: data.clientId,
        clientSecretHash: secretHash,
        redirectUris: data.redirectUris,
        scopes: data.scopes,
        isPublic: data.isPublic ?? true,
      });
    },
  };
}
