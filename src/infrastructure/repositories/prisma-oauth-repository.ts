import { prisma } from "@/src/infrastructure/database/prisma";
import type {
  OAuthRepository,
  OAuthClientRecord,
  AuthorizationCodeRecord,
  OAuthAccessTokenRecord,
  OAuthRefreshTokenRecord,
} from "@/src/domain/identity/oauth";

import type {
  OAuthClient as PrismaOAuthClient,
  AuthorizationCode as PrismaAuthCode,
  OAuthAccessToken as PrismaAccessToken,
  OAuthRefreshToken as PrismaRefreshToken,
} from "@prisma/client";

function mapClient(row: PrismaOAuthClient): OAuthClientRecord {
  return {
    id: row.id,
    name: row.name,
    clientId: row.clientId,
    clientSecretHash: row.clientSecretHash,
    redirectUris: Array.isArray(row.redirectUris) ? (row.redirectUris as string[]) : [],
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    isPublic: row.isPublic,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAuthCode(row: PrismaAuthCode): AuthorizationCodeRecord {
  return {
    id: row.id,
    code: row.code,
    clientId: row.clientId,
    userId: row.userId,
    redirectUri: row.redirectUri,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    codeChallenge: row.codeChallenge,
    codeChallengeMethod: row.codeChallengeMethod as "S256",
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    createdAt: row.createdAt,
  };
}

function mapAccessToken(row: PrismaAccessToken): OAuthAccessTokenRecord {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    clientId: row.clientId,
    userId: row.userId,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

function mapRefreshToken(row: PrismaRefreshToken): OAuthRefreshTokenRecord {
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    clientId: row.clientId,
    userId: row.userId,
    accessTokenId: row.accessTokenId,
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    expiresAt: row.expiresAt,
    revokedAt: row.revokedAt,
    replacedById: row.replacedById,
    createdAt: row.createdAt,
  };
}

export const prismaOAuthRepository: OAuthRepository = {
  async findClientByClientId(clientId: string): Promise<OAuthClientRecord | null> {
    const client = await prisma.oAuthClient.findUnique({
      where: { clientId },
    });
    return client ? mapClient(client) : null;
  },

  async createClient(data): Promise<OAuthClientRecord> {
    const client = await prisma.oAuthClient.create({
      data: {
        name: data.name,
        clientId: data.clientId,
        clientSecretHash: data.clientSecretHash ?? null,
        redirectUris: data.redirectUris,
        scopes: data.scopes,
        isPublic: data.isPublic,
      },
    });
    return mapClient(client);
  },

  async createAuthorizationCode(data): Promise<AuthorizationCodeRecord> {
    const code = await prisma.authorizationCode.create({
      data: {
        code: data.code,
        clientId: data.clientId,
        userId: data.userId,
        redirectUri: data.redirectUri,
        scopes: data.scopes,
        codeChallenge: data.codeChallenge,
        codeChallengeMethod: data.codeChallengeMethod,
        expiresAt: data.expiresAt,
      },
    });
    return mapAuthCode(code);
  },

  async findAuthorizationCode(code: string): Promise<AuthorizationCodeRecord | null> {
    const record = await prisma.authorizationCode.findUnique({
      where: { code },
    });
    return record ? mapAuthCode(record) : null;
  },

  async consumeAuthorizationCode(id: string): Promise<void> {
    await prisma.authorizationCode.update({
      where: { id },
      data: { consumedAt: new Date() },
    });
  },

  async createAccessToken(data): Promise<OAuthAccessTokenRecord> {
    const record = await prisma.oAuthAccessToken.create({
      data: {
        tokenHash: data.tokenHash,
        clientId: data.clientId,
        userId: data.userId,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
      },
    });
    return mapAccessToken(record);
  },

  async findAccessTokenByHash(tokenHash: string): Promise<OAuthAccessTokenRecord | null> {
    const record = await prisma.oAuthAccessToken.findUnique({
      where: { tokenHash },
    });
    return record ? mapAccessToken(record) : null;
  },

  async revokeAccessToken(tokenHash: string): Promise<void> {
    await prisma.oAuthAccessToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  },

  async createRefreshToken(data): Promise<OAuthRefreshTokenRecord> {
    const record = await prisma.oAuthRefreshToken.create({
      data: {
        tokenHash: data.tokenHash,
        clientId: data.clientId,
        userId: data.userId,
        accessTokenId: data.accessTokenId ?? null,
        scopes: data.scopes,
        expiresAt: data.expiresAt,
      },
    });
    return mapRefreshToken(record);
  },

  async findRefreshTokenByHash(tokenHash: string): Promise<OAuthRefreshTokenRecord | null> {
    const record = await prisma.oAuthRefreshToken.findUnique({
      where: { tokenHash },
    });
    return record ? mapRefreshToken(record) : null;
  },

  async rotateRefreshToken(oldHash: string, newId: string): Promise<void> {
    await prisma.oAuthRefreshToken.updateMany({
      where: { tokenHash: oldHash },
      data: {
        revokedAt: new Date(),
        replacedById: newId,
      },
    });
  },

  async revokeRefreshToken(tokenHash: string): Promise<void> {
    await prisma.oAuthRefreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  },
};
