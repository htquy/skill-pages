-- Theo dõi usage theo từng user & appSlug theo tháng + cấu hình hạn mức credit / model fallback (OpenRouter)
ALTER TABLE "ai"."ai_usage_logs"
  ADD COLUMN IF NOT EXISTS "userId" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "appSlug" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "cachedTokens" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "costUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "creditsCharged" DECIMAL(12,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "fallbackUsed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "fallbackFrom" VARCHAR(120);

CREATE INDEX IF NOT EXISTS "ai_usage_logs_userId_appSlug_createdAt_idx"
  ON "ai"."ai_usage_logs"("userId", "appSlug", "createdAt");

CREATE INDEX IF NOT EXISTS "ai_usage_logs_userId_createdAt_idx"
  ON "ai"."ai_usage_logs"("userId", "createdAt");

CREATE TABLE IF NOT EXISTS "ai"."ai_app_credit_policies" (
  "id" TEXT NOT NULL,
  "appSlug" VARCHAR(120) NOT NULL,
  "planKey" VARCHAR(80) NOT NULL DEFAULT 'FREE',
  "monthlyCredits" DECIMAL(12,4) NOT NULL DEFAULT 50,
  "usdPerCredit" DECIMAL(12,6) NOT NULL DEFAULT 0.002,
  "resetMode" VARCHAR(20) NOT NULL DEFAULT 'MONTHLY',
  "primaryProvider" VARCHAR(60) NOT NULL DEFAULT 'openrouter',
  "primaryModel" VARCHAR(120) NOT NULL DEFAULT 'anthropic/claude-haiku-5.5',
  "fallbackProvider" VARCHAR(60) DEFAULT 'openrouter',
  "fallbackModel" VARCHAR(120) DEFAULT 'openai/gpt-6-luna',
  "allowedModels" TEXT[] DEFAULT ARRAY['anthropic/claude-haiku-5.5', 'openai/gpt-6-luna']::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "description" VARCHAR(500),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_app_credit_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_app_credit_policies_appSlug_isActive_idx"
  ON "ai"."ai_app_credit_policies"("appSlug", "isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "ai_app_credit_policies_appSlug_planKey_key"
  ON "ai"."ai_app_credit_policies"("appSlug", "planKey");

CREATE TABLE IF NOT EXISTS "ai"."ai_user_credit_periods" (
  "id" TEXT NOT NULL,
  "userId" VARCHAR(120) NOT NULL,
  "appSlug" VARCHAR(120) NOT NULL,
  "periodKey" VARCHAR(16) NOT NULL,
  "planKey" VARCHAR(80) NOT NULL DEFAULT 'FREE',
  "allowanceCredits" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "bonusCredits" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "usedCredits" DECIMAL(12,4) NOT NULL DEFAULT 0,
  "usedCostUsd" DECIMAL(12,6) NOT NULL DEFAULT 0,
  "requestCount" INTEGER NOT NULL DEFAULT 0,
  "promptTokens" INTEGER NOT NULL DEFAULT 0,
  "cachedTokens" INTEGER NOT NULL DEFAULT 0,
  "completionTokens" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_user_credit_periods_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_user_credit_periods_appSlug_periodKey_idx"
  ON "ai"."ai_user_credit_periods"("appSlug", "periodKey");

CREATE INDEX IF NOT EXISTS "ai_user_credit_periods_userId_periodKey_idx"
  ON "ai"."ai_user_credit_periods"("userId", "periodKey");

CREATE UNIQUE INDEX IF NOT EXISTS "ai_user_credit_periods_userId_appSlug_periodKey_key"
  ON "ai"."ai_user_credit_periods"("userId", "appSlug", "periodKey");
