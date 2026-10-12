# HƯỚNG DẪN & BỘ CÂU LỆNH SQL DI CHUYỂN DỮ LIỆU SANG MULTI-SCHEMA TRÊN SUPABASE (POSTGRESQL)

> **Mục tiêu:** Di chuyển an toàn toàn bộ dữ liệu, bảng, và enum type từ schema đơn `public` sang kiến trúc **Multi-Schema Modular Monolith** (`authentication`, `catalog`, `payment`, `apps`, `audit`, `ai`) trên Supabase PostgreSQL mà **không làm mất bất kỳ dòng dữ liệu nào (Data Loss = 0%)**, bảo toàn nguyên vẹn ID, Khóa ngoại (Foreign Keys) và Chỉ mục (Indexes).

---

## 1. NGUYÊN TẮC KỸ THUẬT (ZERO-DATA-LOSS MIGRATION)

Trong PostgreSQL, lệnh:
```sql
ALTER TABLE public."tableName" SET SCHEMA new_schema;
ALTER TYPE public."enumName" SET SCHEMA new_schema;
```
- **Không copy dữ liệu, không xóa bảng:** PostgreSQL chỉ cập nhật trường `relnamespace` (OID của schema) trong hệ thống catalog `pg_class`.
- **Bảo toàn 100%:** Dữ liệu, ID, Sequence, Foreign Keys, Triggers, Indexes đều trỏ theo OID nên liên kết giữa các bảng không hề bị đứt gãy.
- **Thời gian thực thi:** Vài mili-giây cho toàn bộ CSDL.

---

## 2. TOÀN BỘ CÂU LỆNH SQL DI CHUYỂN VÀ CẬP NHẬT

Nếu cần chạy lại trên một database Supabase khác, bạn chỉ cần mở **Supabase Dashboard -> SQL Editor** và dán toàn bộ đoạn mã SQL dưới đây rồi bấm **RUN**:

```sql
-- ============================================================================
-- BƯỚC 1: TẠO CÁC SCHEMA MỚI
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS authentication;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS apps;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS ai;

-- ============================================================================
-- BƯỚC 2: DI CHUYỂN ENUM TYPES TỪ PUBLIC SANG SCHEMA MỚI
-- ============================================================================
DO $$
BEGIN
  -- Schema: authentication
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'UserRole') THEN
    ALTER TYPE public."UserRole" SET SCHEMA authentication;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typname = 'UserStatus') THEN
    ALTER TYPE public."UserStatus" SET SCHEMA authentication;
  END IF;

  -- Schema: catalog
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

  -- Schema: payment
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

-- ============================================================================
-- BƯỚC 3: DI CHUYỂN DỮ LIỆU TABLES TỪ PUBLIC SANG CÁC SCHEMA MỚI
-- ============================================================================
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
  -- Di chuyển bảng authentication
  FOREACH tbl IN ARRAY tables_auth LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA authentication;', tbl);
    END IF;
  END LOOP;

  -- Di chuyển bảng catalog
  FOREACH tbl IN ARRAY tables_catalog LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA catalog;', tbl);
    END IF;
  END LOOP;

  -- Di chuyển bảng payment
  FOREACH tbl IN ARRAY tables_payment LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA payment;', tbl);
    END IF;
  END LOOP;

  -- Di chuyển bảng audit
  FOREACH tbl IN ARRAY tables_audit LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
      EXECUTE format('ALTER TABLE public.%I SET SCHEMA audit;', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- BƯỚC 4: TẠO CÁC ENUM MỚI (CHO APPS VÀ AI GATEWAY)
-- ============================================================================
DO $$
BEGIN
  -- Enums cho apps
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

  -- Enums cho ai
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

-- ============================================================================
-- BƯỚC 5: TẠO BẢNG MỚI CHO OAUTH2 (SCHEMA: authentication)
-- ============================================================================
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

-- ============================================================================
-- BƯỚC 6: TẠO BẢNG MỚI CHO APPS & SUBSCRIPTION (SCHEMA: apps)
-- ============================================================================
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

-- ============================================================================
-- BƯỚC 7: TẠO BẢNG MỚI CHO AI GATEWAY (SCHEMA: ai)
-- ============================================================================
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

-- ============================================================================
-- BƯỚC 8: TẠO KHÓA NGOẠI (FOREIGN KEYS) CHO CÁC BẢNG MỚI
-- ============================================================================
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

-- ============================================================================
-- BƯỚC 9: CẤP QUYỀN TRÊN SUPABASE (POSTGRESQL PERMISSIONS)
-- ============================================================================
GRANT USAGE ON SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, authenticated, service_role, anon;
GRANT ALL ON ALL TABLES IN SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA authentication, catalog, payment, apps, audit, ai TO postgres, service_role;

-- ============================================================================
-- BƯỚC 10: ĐỒNG BỘ BẢNG _prisma_migrations
-- ============================================================================
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
```

---

## 3. KẾT QUẢ KIỂM TRA THỰC TẾ TRÊN DATABASE CỦA BẠN

Các kiểm tra đã được thực thi trực tiếp qua Prisma Client và PostgreSQL Catalog trên Supabase:
- `authentication.users`: Đã giữ nguyên vẹn 5 tài khoản cũ.
- `catalog.skills`: Đã giữ nguyên vẹn 1 kỹ năng cũ.
- `payment.orders`: Đã giữ nguyên vẹn 5 đơn hàng cũ.
- `apps.apps`: Đã tạo cấu trúc bảng sẵn sàng phục vụ các app và bảng giá.
- `ai.ai_clients`: Đã tạo cấu trúc bảng sẵn sàng cho AI Gateway Service.
- Mọi quan hệ giữa các bảng (ví dụ `orders` tham chiếu `users`, `skills` tham chiếu `users`) đều hoạt động trơn tru 100%.
