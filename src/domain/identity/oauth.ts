export interface OAuthClientRecord {
  id: string;
  name: string;
  clientId: string;
  clientSecretHash: string | null;
  redirectUris: string[];
  scopes: string[];
  isPublic: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthorizationCodeRecord {
  id: string;
  code: string;
  clientId: string;
  userId: string;
  redirectUri: string;
  scopes: string[];
  codeChallenge: string;
  codeChallengeMethod: "S256";
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface OAuthAccessTokenRecord {
  id: string;
  tokenHash: string;
  clientId: string;
  userId: string;
  scopes: string[];
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface OAuthRefreshTokenRecord {
  id: string;
  tokenHash: string;
  clientId: string;
  userId: string;
  accessTokenId: string | null;
  scopes: string[];
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdAt: Date;
}

export interface OAuthRepository {
  findClientByClientId(clientId: string): Promise<OAuthClientRecord | null>;
  createClient(data: {
    name: string;
    clientId: string;
    clientSecretHash?: string | null;
    redirectUris: string[];
    scopes: string[];
    isPublic: boolean;
  }): Promise<OAuthClientRecord>;

  createAuthorizationCode(data: {
    code: string;
    clientId: string;
    userId: string;
    redirectUri: string;
    scopes: string[];
    codeChallenge: string;
    codeChallengeMethod: "S256";
    expiresAt: Date;
  }): Promise<AuthorizationCodeRecord>;

  findAuthorizationCode(code: string): Promise<AuthorizationCodeRecord | null>;
  consumeAuthorizationCode(id: string): Promise<void>;

  createAccessToken(data: {
    tokenHash: string;
    clientId: string;
    userId: string;
    scopes: string[];
    expiresAt: Date;
  }): Promise<OAuthAccessTokenRecord>;

  findAccessTokenByHash(tokenHash: string): Promise<OAuthAccessTokenRecord | null>;
  revokeAccessToken(tokenHash: string): Promise<void>;

  createRefreshToken(data: {
    tokenHash: string;
    clientId: string;
    userId: string;
    accessTokenId?: string | null;
    scopes: string[];
    expiresAt: Date;
  }): Promise<OAuthRefreshTokenRecord>;

  findRefreshTokenByHash(tokenHash: string): Promise<OAuthRefreshTokenRecord | null>;
  rotateRefreshToken(oldHash: string, newId: string): Promise<void>;
  revokeRefreshToken(tokenHash: string): Promise<void>;
}
