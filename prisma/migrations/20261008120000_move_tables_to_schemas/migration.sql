-- Move existing tables and enum types into their dedicated schemas.
-- Keeps all rows, indexes and foreign keys (FKs bind by OID, so cross-schema still valid).

CREATE SCHEMA IF NOT EXISTS authentication;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS payment;
CREATE SCHEMA IF NOT EXISTS apps;
CREATE SCHEMA IF NOT EXISTS audit;

-- Enum types
ALTER TYPE public."UserRole" SET SCHEMA authentication;
ALTER TYPE public."UserStatus" SET SCHEMA authentication;
ALTER TYPE public."ContentStatus" SET SCHEMA catalog;
ALTER TYPE public."AIToolStatus" SET SCHEMA catalog;
ALTER TYPE public."RankingPeriodType" SET SCHEMA catalog;
ALTER TYPE public."RankingStatus" SET SCHEMA catalog;
ALTER TYPE public."ToolType" SET SCHEMA catalog;
ALTER TYPE public."ToolBillingType" SET SCHEMA catalog;
ALTER TYPE public."SkillAccessType" SET SCHEMA catalog;
ALTER TYPE public."OrderStatus" SET SCHEMA payment;
ALTER TYPE public."PaymentStatus" SET SCHEMA payment;
ALTER TYPE public."SkillAccessSource" SET SCHEMA payment;
ALTER TYPE public."WebhookEventStatus" SET SCHEMA payment;

-- authentication
ALTER TABLE public."Account" SET SCHEMA authentication;
ALTER TABLE public."sessions" SET SCHEMA authentication;
ALTER TABLE public."users" SET SCHEMA authentication;
ALTER TABLE public."VerificationToken" SET SCHEMA authentication;

-- catalog
ALTER TABLE public."AITool" SET SCHEMA catalog;
ALTER TABLE public."NewsToolLink" SET SCHEMA catalog;
ALTER TABLE public."Ranking" SET SCHEMA catalog;
ALTER TABLE public."RankingEntry" SET SCHEMA catalog;
ALTER TABLE public."Skill" SET SCHEMA catalog;
ALTER TABLE public."SkillCategoryLink" SET SCHEMA catalog;
ALTER TABLE public."SkillFavorite" SET SCHEMA catalog;
ALTER TABLE public."SkillIndustryLink" SET SCHEMA catalog;
ALTER TABLE public."SkillPrice" SET SCHEMA catalog;
ALTER TABLE public."SkillToolLink" SET SCHEMA catalog;
ALTER TABLE public."SkillUseCaseLink" SET SCHEMA catalog;
ALTER TABLE public."SkillVersion" SET SCHEMA catalog;
ALTER TABLE public."SkillView" SET SCHEMA catalog;
ALTER TABLE public."ToolClick" SET SCHEMA catalog;
ALTER TABLE public."UseCase" SET SCHEMA catalog;
ALTER TABLE public."industries" SET SCHEMA catalog;
ALTER TABLE public."news_articles" SET SCHEMA catalog;
ALTER TABLE public."news_categories" SET SCHEMA catalog;
ALTER TABLE public."skill_categories" SET SCHEMA catalog;
ALTER TABLE public."tool_prices" SET SCHEMA catalog;
ALTER TABLE public."tool_versions" SET SCHEMA catalog;
ALTER TABLE public."tools" SET SCHEMA catalog;

-- payment
ALTER TABLE public."orders" SET SCHEMA payment;
ALTER TABLE public."payment_transactions" SET SCHEMA payment;
ALTER TABLE public."skill_accesses" SET SCHEMA payment;
ALTER TABLE public."webhook_events" SET SCHEMA payment;

-- audit
ALTER TABLE public."audit_logs" SET SCHEMA audit;
