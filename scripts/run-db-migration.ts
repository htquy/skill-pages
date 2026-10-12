import { PrismaClient } from "@prisma/client";

const supabaseUrl = "postgresql://postgres.fpqrrbdzeqmlnsjvgfeb:Ra9WjSfeL0ihrJ7Z@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require&statement_cache_size=0";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: supabaseUrl,
    },
  },
});

async function exec(title: string, sql: string) {
  process.stdout.write(`⏳ ${title}... `);
  try {
    await prisma.$executeRawUnsafe(sql);
    console.log("✅");
  } catch (err: any) {
    console.log("❌");
    console.error(`Chi tiết lỗi tại [${title}]:`, err.message);
    throw err;
  }
}

async function main() {
  console.log("==================================================================");
  console.log("BẮT ĐẦU QUÁ TRÌNH DI CHUYỂN DỮ LIỆU SANG MULTI-SCHEMA TRÊN SUPABASE");
  console.log("==================================================================");

  // 1. Tạo Schemas
  const schemas = ["authentication", "catalog", "payment", "apps", "audit", "ai"];
  for (const s of schemas) {
    await exec(`Tạo schema '${s}'`, `CREATE SCHEMA IF NOT EXISTS ${s};`);
  }

  // 2. Di chuyển ENUM types từ public
  await exec(
    "Di chuyển ENUM types sang các schema mới",
    `
    DO $$
    BEGIN
      -- authentication enums
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'UserRole') THEN
        ALTER TYPE public."UserRole" SET SCHEMA authentication;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'UserStatus') THEN
        ALTER TYPE public."UserStatus" SET SCHEMA authentication;
      END IF;

      -- catalog enums
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'ContentStatus') THEN
        ALTER TYPE public."ContentStatus" SET SCHEMA catalog;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'AIToolStatus') THEN
        ALTER TYPE public."AIToolStatus" SET SCHEMA catalog;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'RankingPeriodType') THEN
        ALTER TYPE public."RankingPeriodType" SET SCHEMA catalog;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'RankingStatus') THEN
        ALTER TYPE public."RankingStatus" SET SCHEMA catalog;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'ToolType') THEN
        ALTER TYPE public."ToolType" SET SCHEMA catalog;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'ToolBillingType') THEN
        ALTER TYPE public."ToolBillingType" SET SCHEMA catalog;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'SkillAccessType') THEN
        ALTER TYPE public."SkillAccessType" SET SCHEMA catalog;
      END IF;

      -- payment enums
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'OrderStatus') THEN
        ALTER TYPE public."OrderStatus" SET SCHEMA payment;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'PaymentStatus') THEN
        ALTER TYPE public."PaymentStatus" SET SCHEMA payment;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'SkillAccessSource') THEN
        ALTER TYPE public."SkillAccessSource" SET SCHEMA payment;
      END IF;
      IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'WebhookEventStatus') THEN
        ALTER TYPE public."WebhookEventStatus" SET SCHEMA payment;
      END IF;
    END $$;
    `
  );

  // 3. Di chuyển TABLES từ public sang các schemas mới
  await exec(
    "Di chuyển TABLES từ public sang schema tương ứng (giữ nguyên dữ liệu)",
    `
    DO $$
    DECLARE
      tables_auth text[] := ARRAY['Account', 'sessions', 'users', 'VerificationToken'];
      tables_catalog text[] := ARRAY[
        'AITool', 'NewsToolLink', 'Ranking', 'RankingEntry', 'Skill', 'SkillCategoryLink',
        'SkillFavorite', 'SkillIndustryLink', 'SkillPrice', 'SkillToolLink', 'SkillUseCaseLink',
        'SkillVersion', 'SkillView', 'ToolClick', 'UseCase', 'industries', 'news_articles',
        'news_categories', 'skill_categories', 'tool_prices', 'tool_versions', 'tools'
      ];
      tables_payment text[] := ARRAY['orders', 'payment_transactions', 'skill_accesses', 'webhook_events'];
      tables_audit text[] := ARRAY['audit_logs'];
      tbl text;
    BEGIN
      -- authentication
      FOREACH tbl IN ARRAY tables_auth LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
          EXECUTE format('ALTER TABLE public.%I SET SCHEMA authentication;', tbl);
        END IF;
      END LOOP;

      -- catalog
      FOREACH tbl IN ARRAY tables_catalog LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
          EXECUTE format('ALTER TABLE public.%I SET SCHEMA catalog;', tbl);
        END IF;
      END LOOP;

      -- payment
      FOREACH tbl IN ARRAY tables_payment LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
          EXECUTE format('ALTER TABLE public.%I SET SCHEMA payment;', tbl);
        END IF;
      END LOOP;

      -- audit
      FOREACH tbl IN ARRAY tables_audit LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
          EXECUTE format('ALTER TABLE public.%I SET SCHEMA audit;', tbl);
        END IF;
      END LOOP;
    END $$;
    `
  );

  // 4. Tạo các Enum mới cho Apps và AI
  await exec(
    "Tạo các Enum mới cho Apps và AI",
    `
    DO $$
    BEGIN
      -- apps enums
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'apps' AND t.typname = 'AppType') THEN
        CREATE TYPE "apps"."AppType" AS ENUM ('WEB_APP', 'DESKTOP_TOOL', 'MOBILE_APP', 'EMBED_WIDGET', 'MCP_SERVER');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'apps' AND t.typname = 'AppStatus') THEN
        CREATE TYPE "apps"."AppStatus" AS ENUM ('ACTIVE', 'INACTIVE');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'apps' AND t.typname = 'MenuAccess') THEN
        CREATE TYPE "apps"."MenuAccess" AS ENUM ('FREE', 'PAID');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'apps' AND t.typname = 'SubscriptionInterval') THEN
        CREATE TYPE "apps"."SubscriptionInterval" AS ENUM ('MONTH', 'QUARTER', 'YEAR', 'CUSTOM');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'apps' AND t.typname = 'SubscriptionStatus') THEN
        CREATE TYPE "apps"."SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELED', 'PENDING');
      END IF;

      -- ai enums
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'ai' AND t.typname = 'AiClientStatus') THEN
        CREATE TYPE "ai"."AiClientStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'ai' AND t.typname = 'AiKeyStatus') THEN
        CREATE TYPE "ai"."AiKeyStatus" AS ENUM ('ACTIVE', 'RATE_LIMITED', 'SUSPENDED', 'EXPIRED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'ai' AND t.typname = 'AiTaskType') THEN
        CREATE TYPE "ai"."AiTaskType" AS ENUM ('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'EMBEDDING');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'ai' AND t.typname = 'AiTaskStatus') THEN
        CREATE TYPE "ai"."AiTaskStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'ai' AND t.typname = 'AiCallbackStatus') THEN
        CREATE TYPE "ai"."AiCallbackStatus" AS ENUM ('NONE', 'PENDING', 'DELIVERED', 'FAILED');
      END IF;
    END $$;
    `
  );

  // 5. Tạo các bảng mới trong authentication (OAuth)
  await exec(
    "Tạo các bảng OAuth trong schema authentication",
    `
    DO $$
    BEGIN
      CREATE TABLE IF NOT EXISTS "authentication"."oauth_clients" (
          "id" TEXT NOT NULL,
          "name" VARCHAR(160) NOT NULL,
          "clientId" VARCHAR(120) NOT NULL,
          "clientSecretHash" VARCHAR(128),
          "redirectUris" JSONB NOT NULL,
          "scopes" JSONB NOT NULL,
          "isPublic" BOOLEAN NOT NULL DEFAULT true,
          "isActive" BOOLEAN NOT NULL DEFAULT true,
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "authentication"."oauth_authorization_codes" (
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

      CREATE TABLE IF NOT EXISTS "authentication"."oauth_access_tokens" (
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

      CREATE TABLE IF NOT EXISTS "authentication"."oauth_refresh_tokens" (
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

      CREATE UNIQUE INDEX IF NOT EXISTS "oauth_clients_clientId_key" ON "authentication"."oauth_clients"("clientId");
      CREATE INDEX IF NOT EXISTS "oauth_clients_isActive_idx" ON "authentication"."oauth_clients"("isActive");

      CREATE UNIQUE INDEX IF NOT EXISTS "oauth_authorization_codes_code_key" ON "authentication"."oauth_authorization_codes"("code");
      CREATE INDEX IF NOT EXISTS "oauth_authorization_codes_clientId_createdAt_idx" ON "authentication"."oauth_authorization_codes"("clientId", "createdAt");

      CREATE UNIQUE INDEX IF NOT EXISTS "oauth_access_tokens_tokenHash_key" ON "authentication"."oauth_access_tokens"("tokenHash");
      CREATE INDEX IF NOT EXISTS "oauth_access_tokens_clientId_idx" ON "authentication"."oauth_access_tokens"("clientId");
      CREATE INDEX IF NOT EXISTS "oauth_access_tokens_userId_idx" ON "authentication"."oauth_access_tokens"("userId");

      CREATE UNIQUE INDEX IF NOT EXISTS "oauth_refresh_tokens_tokenHash_key" ON "authentication"."oauth_refresh_tokens"("tokenHash");
      CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_clientId_idx" ON "authentication"."oauth_refresh_tokens"("clientId");
      CREATE INDEX IF NOT EXISTS "oauth_refresh_tokens_userId_idx" ON "authentication"."oauth_refresh_tokens"("userId");
    END $$;
    `
  );

  // 6. Tạo các bảng mới trong apps
  await exec(
    "Tạo các bảng trong schema apps",
    `
    DO $$
    BEGIN
      CREATE TABLE IF NOT EXISTS "apps"."apps" (
          "id" TEXT NOT NULL,
          "slug" VARCHAR(160) NOT NULL,
          "name" VARCHAR(200) NOT NULL,
          "description" TEXT,
          "type" "apps"."AppType" NOT NULL DEFAULT 'WEB_APP',
          "status" "apps"."AppStatus" NOT NULL DEFAULT 'ACTIVE',
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "apps"."app_menu_items" (
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
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "app_menu_items_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "apps"."features" (
          "id" TEXT NOT NULL,
          "key" VARCHAR(120) NOT NULL,
          "name" VARCHAR(200) NOT NULL,
          "description" TEXT,
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "features_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "apps"."subscription_plans" (
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
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "apps"."plan_features" (
          "planId" TEXT NOT NULL,
          "featureId" TEXT NOT NULL,
          CONSTRAINT "plan_features_pkey" PRIMARY KEY ("planId","featureId")
      );

      CREATE TABLE IF NOT EXISTS "apps"."user_subscriptions" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "appId" TEXT NOT NULL,
          "planId" TEXT NOT NULL,
          "status" "apps"."SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
          "startsAt" TIMESTAMPTZ(3) NOT NULL,
          "endsAt" TIMESTAMPTZ(3),
          "orderId" VARCHAR(64),
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "user_subscriptions_pkey" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "apps_slug_key" ON "apps"."apps"("slug");
      CREATE INDEX IF NOT EXISTS "apps_status_idx" ON "apps"."apps"("status");
      CREATE INDEX IF NOT EXISTS "app_menu_items_appId_parentId_sortOrder_idx" ON "apps"."app_menu_items"("appId", "parentId", "sortOrder");
      CREATE UNIQUE INDEX IF NOT EXISTS "features_key_key" ON "apps"."features"("key");
      CREATE INDEX IF NOT EXISTS "subscription_plans_appId_isActive_idx" ON "apps"."subscription_plans"("appId", "isActive");
      CREATE INDEX IF NOT EXISTS "plan_features_featureId_idx" ON "apps"."plan_features"("featureId");
      CREATE INDEX IF NOT EXISTS "user_subscriptions_userId_appId_status_idx" ON "apps"."user_subscriptions"("userId", "appId", "status");
      CREATE INDEX IF NOT EXISTS "user_subscriptions_appId_status_endsAt_idx" ON "apps"."user_subscriptions"("appId", "status", "endsAt");
    END $$;
    `
  );

  // 7. Tạo các bảng mới trong schema ai
  await exec(
    "Tạo các bảng trong schema ai",
    `
    DO $$
    BEGIN
      CREATE TABLE IF NOT EXISTS "ai"."ai_clients" (
          "id" TEXT NOT NULL,
          "name" VARCHAR(160) NOT NULL,
          "apiKey" VARCHAR(128) NOT NULL,
          "status" "ai"."AiClientStatus" NOT NULL DEFAULT 'ACTIVE',
          "rateLimitPerMin" INTEGER NOT NULL DEFAULT 60,
          "allowedProviders" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "allowedTasks" TEXT[] DEFAULT ARRAY[]::TEXT[],
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ai_clients_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "ai"."ai_provider_keys" (
          "id" TEXT NOT NULL,
          "provider" VARCHAR(60) NOT NULL,
          "keySecret" TEXT NOT NULL,
          "alias" VARCHAR(120),
          "status" "ai"."AiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
          "cooldownUntil" TIMESTAMPTZ(3),
          "failureCount" INTEGER NOT NULL DEFAULT 0,
          "successCount" INTEGER NOT NULL DEFAULT 0,
          "weight" INTEGER NOT NULL DEFAULT 1,
          "lastUsedAt" TIMESTAMPTZ(3),
          "clientId" VARCHAR(120),
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ai_provider_keys_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "ai"."ai_tasks" (
          "id" TEXT NOT NULL,
          "clientId" VARCHAR(120),
          "taskType" "ai"."AiTaskType" NOT NULL,
          "status" "ai"."AiTaskStatus" NOT NULL DEFAULT 'PENDING',
          "provider" VARCHAR(60) NOT NULL,
          "model" VARCHAR(120) NOT NULL,
          "prompt" TEXT,
          "inputParams" JSONB,
          "outputResult" JSONB,
          "errorMessage" TEXT,
          "callbackUrl" VARCHAR(500),
          "callbackStatus" "ai"."AiCallbackStatus" NOT NULL DEFAULT 'NONE',
          "executionTimeMs" INTEGER,
          "tokensConsumed" INTEGER,
          "costUsd" DECIMAL(10, 6),
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ai_tasks_pkey" PRIMARY KEY ("id")
      );

      CREATE TABLE IF NOT EXISTS "ai"."ai_usage_logs" (
          "id" TEXT NOT NULL,
          "clientId" VARCHAR(120),
          "taskId" VARCHAR(120),
          "taskType" "ai"."AiTaskType" NOT NULL,
          "provider" VARCHAR(60) NOT NULL,
          "model" VARCHAR(120) NOT NULL,
          "promptTokens" INTEGER NOT NULL DEFAULT 0,
          "completionTokens" INTEGER NOT NULL DEFAULT 0,
          "totalTokens" INTEGER NOT NULL DEFAULT 0,
          "latencyMs" INTEGER NOT NULL DEFAULT 0,
          "statusCode" INTEGER NOT NULL DEFAULT 200,
          "errorMessage" TEXT,
          "ipAddress" VARCHAR(64),
          "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "ai_usage_logs_pkey" PRIMARY KEY ("id")
      );

      CREATE UNIQUE INDEX IF NOT EXISTS "ai_clients_apiKey_key" ON "ai"."ai_clients"("apiKey");
      CREATE INDEX IF NOT EXISTS "ai_clients_status_idx" ON "ai"."ai_clients"("status");

      CREATE INDEX IF NOT EXISTS "ai_provider_keys_provider_status_cooldownUntil_idx" ON "ai"."ai_provider_keys"("provider", "status", "cooldownUntil");
      CREATE INDEX IF NOT EXISTS "ai_provider_keys_clientId_idx" ON "ai"."ai_provider_keys"("clientId");

      CREATE INDEX IF NOT EXISTS "ai_tasks_status_createdAt_idx" ON "ai"."ai_tasks"("status", "createdAt");
      CREATE INDEX IF NOT EXISTS "ai_tasks_clientId_createdAt_idx" ON "ai"."ai_tasks"("clientId", "createdAt");

      CREATE INDEX IF NOT EXISTS "ai_usage_logs_clientId_createdAt_idx" ON "ai"."ai_usage_logs"("clientId", "createdAt");
      CREATE INDEX IF NOT EXISTS "ai_usage_logs_provider_model_createdAt_idx" ON "ai"."ai_usage_logs"("provider", "model", "createdAt");
    END $$;
    `
  );

  // 8. Tạo Foreign Keys an toàn
  await exec(
    "Tạo Foreign Keys cho các bảng mới",
    `
    DO $$
    BEGIN
      -- oauth foreign keys
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_authorization_codes_clientId_fkey') THEN
        ALTER TABLE "authentication"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "authentication"."oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_authorization_codes_userId_fkey') THEN
        ALTER TABLE "authentication"."oauth_authorization_codes" ADD CONSTRAINT "oauth_authorization_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_access_tokens_clientId_fkey') THEN
        ALTER TABLE "authentication"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "authentication"."oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_access_tokens_userId_fkey') THEN
        ALTER TABLE "authentication"."oauth_access_tokens" ADD CONSTRAINT "oauth_access_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_refresh_tokens_clientId_fkey') THEN
        ALTER TABLE "authentication"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "authentication"."oauth_clients"("clientId") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_refresh_tokens_userId_fkey') THEN
        ALTER TABLE "authentication"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'oauth_refresh_tokens_accessTokenId_fkey') THEN
        ALTER TABLE "authentication"."oauth_refresh_tokens" ADD CONSTRAINT "oauth_refresh_tokens_accessTokenId_fkey" FOREIGN KEY ("accessTokenId") REFERENCES "authentication"."oauth_access_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;

      -- apps foreign keys
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_menu_items_appId_fkey') THEN
        ALTER TABLE "apps"."app_menu_items" ADD CONSTRAINT "app_menu_items_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_menu_items_parentId_fkey') THEN
        ALTER TABLE "apps"."app_menu_items" ADD CONSTRAINT "app_menu_items_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "apps"."app_menu_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_menu_items_requiredFeatureId_fkey') THEN
        ALTER TABLE "apps"."app_menu_items" ADD CONSTRAINT "app_menu_items_requiredFeatureId_fkey" FOREIGN KEY ("requiredFeatureId") REFERENCES "apps"."features"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_appId_fkey') THEN
        ALTER TABLE "apps"."subscription_plans" ADD CONSTRAINT "subscription_plans_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_features_planId_fkey') THEN
        ALTER TABLE "apps"."plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "apps"."subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_features_featureId_fkey') THEN
        ALTER TABLE "apps"."plan_features" ADD CONSTRAINT "plan_features_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "apps"."features"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_userId_fkey') THEN
        ALTER TABLE "apps"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authentication"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_appId_fkey') THEN
        ALTER TABLE "apps"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_subscriptions_planId_fkey') THEN
        ALTER TABLE "apps"."user_subscriptions" ADD CONSTRAINT "user_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "apps"."subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;

      -- ai foreign keys
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_provider_keys_clientId_fkey') THEN
        ALTER TABLE "ai"."ai_provider_keys" ADD CONSTRAINT "ai_provider_keys_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ai"."ai_clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_tasks_clientId_fkey') THEN
        ALTER TABLE "ai"."ai_tasks" ADD CONSTRAINT "ai_tasks_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ai"."ai_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_usage_logs_clientId_fkey') THEN
        ALTER TABLE "ai"."ai_usage_logs" ADD CONSTRAINT "ai_usage_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ai"."ai_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
    `
  );

  // 9. Cấp quyền trên Supabase
  await exec(
    "Cấp quyền USAGE và ALL TABLES trên Supabase",
    `
    DO $$
    BEGIN
      GRANT USAGE ON SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, authenticated, service_role, anon;
      GRANT ALL ON ALL TABLES IN SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, service_role;
      GRANT ALL ON ALL SEQUENCES IN SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, service_role;
      GRANT ALL ON ALL ROUTINES IN SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, service_role;
    END $$;
    `
  );

  // 10. Ghi nhận migration vào public._prisma_migrations để Prisma đồng bộ trạng thái
  await exec(
    "Đồng bộ bảng _prisma_migrations",
    `
    DO $$
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations') THEN
        INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
        VALUES 
          ('mig_move_tables_to_schemas', 'manual_applied', NOW(), '20261008120000_move_tables_to_schemas', NULL, NULL, NOW(), 1),
          ('mig_add_oauth_and_apps', 'manual_applied', NOW(), '20261008130000_add_oauth_and_apps', NULL, NULL, NOW(), 1)
        ON CONFLICT (id) DO NOTHING;
      END IF;
    END $$;
    `
  );

  console.log("\n==================================================================");
  console.log("🎉 DI CHUYỂN DỮ LIỆU SANG MULTI-SCHEMA SUPABASE THÀNH CÔNG 100%!");
  console.log("==================================================================");
}

main()
  .catch((e) => {
    console.error("\n❌ Di chuyển thất bại:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
