-- CreateEnum
CREATE TYPE "apps"."AppType" AS ENUM ('WEB_APP', 'DESKTOP_TOOL', 'MOBILE_APP', 'EMBED_WIDGET', 'MCP_SERVER');

-- CreateEnum
CREATE TYPE "apps"."AppStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "apps"."MenuAccess" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "apps"."SubscriptionInterval" AS ENUM ('MONTH', 'QUARTER', 'YEAR', 'CUSTOM');

-- CreateEnum
CREATE TYPE "apps"."SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED', 'PENDING');

-- CreateTable
CREATE TABLE "authentication"."oauth_clients" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "clientId" VARCHAR(120) NOT NULL,
    "clientSecretHash" VARCHAR(128),
    "redirectUris" JSONB NOT NULL,
    "scopes" JSONB NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentication"."oauth_authorization_codes" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(160) NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "codeChallenge" VARCHAR(256) NOT NULL,
    "codeChallengeMethod" VARCHAR(16) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "consumedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_authorization_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentication"."oauth_access_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scopes" JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentication"."oauth_refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessTokenId" TEXT,
    "scopes" JSONB NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "replacedById" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps"."apps" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "type" "apps"."AppType" NOT NULL DEFAULT 'WEB_APP',
    "status" "apps"."AppStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps"."app_menu_items" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "parentId" TEXT,
    "label" VARCHAR(160) NOT NULL,
    "path" VARCHAR(400),
    "icon" VARCHAR(80),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "access" "apps"."MenuAccess" NOT NULL DEFAULT 'FREE',
    "requiredFeatureId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps"."features" (
    "id" TEXT NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps"."subscription_plans" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "price" INTEGER NOT NULL,
    "interval" "apps"."SubscriptionInterval" NOT NULL DEFAULT 'MONTH',
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps"."plan_features" (
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("planId","featureId")
);

-- CreateTable
CREATE TABLE "apps"."user_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "apps"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMPTZ(3) NOT NULL,
    "endsAt" TIMESTAMPTZ(3),
    "orderId" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_clients_clientId_key" ON "authentication"."oauth_clients"("clientId");

-- CreateIndex
CREATE INDEX "oauth_clients_isActive_idx" ON "authentication"."oauth_clients"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorization_codes_code_key" ON "authentication"."oauth_authorization_codes"("code");

-- CreateIndex
CREATE INDEX "oauth_authorization_codes_clientId_createdAt_idx" ON "authentication"."oauth_authorization_codes"("clientId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_access_tokens_tokenHash_key" ON "authentication"."oauth_access_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "oauth_access_tokens_clientId_idx" ON "authentication"."oauth_access_tokens"("clientId");

-- CreateIndex
CREATE INDEX "oauth_access_tokens_userId_idx" ON "authentication"."oauth_access_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_refresh_tokens_tokenHash_key" ON "authentication"."oauth_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "oauth_refresh_tokens_clientId_idx" ON "authentication"."oauth_refresh_tokens"("clientId");

-- CreateIndex
CREATE INDEX "oauth_refresh_tokens_userId_idx" ON "authentication"."oauth_refresh_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "apps_slug_key" ON "apps"."apps"("slug");

-- CreateIndex
CREATE INDEX "apps_status_idx" ON "apps"."apps"("status");

-- CreateIndex
CREATE INDEX "app_menu_items_appId_parentId_sortOrder_idx" ON "apps"."app_menu_items"("appId", "parentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "features_key_key" ON "apps"."features"("key");

-- CreateIndex
CREATE INDEX "subscription_plans_appId_isActive_idx" ON "apps"."subscription_plans"("appId", "isActive");

-- CreateIndex
CREATE INDEX "plan_features_featureId_idx" ON "apps"."plan_features"("featureId");

-- CreateIndex
CREATE INDEX "user_subscriptions_userId_appId_status_idx" ON "apps"."user_subscriptions"("userId", "appId", "status");

-- CreateIndex
CREATE INDEX "user_subscriptions_appId_status_endsAt_idx" ON "apps"."user_subscriptions"("appId", "status", "endsAt");

-- AddForeignKey
ALTER TABLE "authentication"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "authentication"."oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "authentication"."oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "authentication"."oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_accessTokenId_fkey" FOREIGN KEY ("accessTokenId") REFERENCES "authentication"."oauth_access_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."app_menu_items" ADD CONSTRAINT "app_menu_items_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."app_menu_items" ADD CONSTRAINT "app_menu_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "apps"."app_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."app_menu_items" ADD CONSTRAINT "app_menu_items_requiredFeatureId_fkey" FOREIGN KEY ("requiredFeatureId") REFERENCES "apps"."features"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."subscription_plans" ADD CONSTRAINT "subscription_plans_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "apps"."subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."plan_features" ADD CONSTRAINT "plan_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "apps"."features"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "apps"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

