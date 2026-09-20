-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REVERSED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SkillAccessSource" AS ENUM ('ORDER', 'ADMIN_GRANT', 'PROMOTION');

-- CreateEnum
CREATE TYPE "SkillAccessType" AS ENUM ('FREE', 'PAID');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AIToolStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RankingPeriodType" AS ENUM ('WEEK', 'MONTH', 'QUARTER', 'ALL_TIME');

-- CreateEnum
CREATE TYPE "RankingStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120),
    "email" VARCHAR(320),
    "emailVerified" TIMESTAMPTZ(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(3) NOT NULL
);

-- CreateTable
CREATE TABLE "industries" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "industries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_categories" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UseCase" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UseCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AITool" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "status" "AIToolStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AITool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "shortDescription" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "accessType" "SkillAccessType" NOT NULL DEFAULT 'FREE',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT,
    "coverImageUrl" TEXT,
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "favoriteCount" BIGINT NOT NULL DEFAULT 0,
    "ratingAverage" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillVersion" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "instructions" TEXT,
    "variables" JSONB,
    "changelog" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillPrice" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategoryLink" (
    "skillId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "SkillCategoryLink_pkey" PRIMARY KEY ("skillId","categoryId")
);

-- CreateTable
CREATE TABLE "SkillIndustryLink" (
    "skillId" TEXT NOT NULL,
    "industryId" TEXT NOT NULL,

    CONSTRAINT "SkillIndustryLink_pkey" PRIMARY KEY ("skillId","industryId")
);

-- CreateTable
CREATE TABLE "SkillUseCaseLink" (
    "skillId" TEXT NOT NULL,
    "useCaseId" TEXT NOT NULL,

    CONSTRAINT "SkillUseCaseLink_pkey" PRIMARY KEY ("skillId","useCaseId")
);

-- CreateTable
CREATE TABLE "SkillToolLink" (
    "skillId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,

    CONSTRAINT "SkillToolLink_pkey" PRIMARY KEY ("skillId","toolId")
);

-- CreateTable
CREATE TABLE "news_articles" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "title" VARCHAR(260) NOT NULL,
    "excerpt" VARCHAR(600),
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "sourceName" VARCHAR(160) NOT NULL,
    "sourceUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "categoryId" TEXT,

    CONSTRAINT "news_articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_categories" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(160) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "news_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsToolLink" (
    "articleId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,

    CONSTRAINT "NewsToolLink_pkey" PRIMARY KEY ("articleId","toolId")
);

-- CreateTable
CREATE TABLE "Ranking" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(220) NOT NULL,
    "slug" VARCHAR(220) NOT NULL,
    "industryId" TEXT,
    "categoryId" TEXT,
    "periodType" "RankingPeriodType" NOT NULL DEFAULT 'MONTH',
    "periodStart" TIMESTAMPTZ(3),
    "periodEnd" TIMESTAMPTZ(3),
    "status" "RankingStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Ranking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingEntry" (
    "id" TEXT NOT NULL,
    "rankingId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "score" DECIMAL(12,4) NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "favorites" BIGINT NOT NULL DEFAULT 0,
    "clicks" BIGINT NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "RankingEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillFavorite" (
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillFavorite_pkey" PRIMARY KEY ("userId","skillId")
);

-- CreateTable
CREATE TABLE "SkillView" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionHash" VARCHAR(64),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolClick" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "userId" TEXT,
    "source" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToolClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderCode" VARCHAR(40) NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(8) NOT NULL DEFAULT 'VND',
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "paidAt" TIMESTAMPTZ(3),
    "canceledAt" TIMESTAMPTZ(3),
    "refundedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "providerTransactionId" VARCHAR(160) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "rawPayload" JSONB,
    "paidAt" TIMESTAMPTZ(3),
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_accesses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "orderId" TEXT,
    "source" "SkillAccessSource" NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "skill_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" VARCHAR(64),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "industries_slug_key" ON "industries"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skill_categories_slug_key" ON "skill_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "UseCase_slug_key" ON "UseCase"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "AITool_slug_key" ON "AITool"("slug");

-- CreateIndex
CREATE INDEX "AITool_status_idx" ON "AITool"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_slug_key" ON "Skill"("slug");

-- CreateIndex
CREATE INDEX "Skill_status_publishedAt_idx" ON "Skill"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "Skill_accessType_idx" ON "Skill"("accessType");

-- CreateIndex
CREATE INDEX "Skill_favoriteCount_idx" ON "Skill"("favoriteCount");

-- CreateIndex
CREATE INDEX "Skill_createdAt_idx" ON "Skill"("createdAt");

-- CreateIndex
CREATE INDEX "SkillVersion_skillId_version_idx" ON "SkillVersion"("skillId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "SkillVersion_skillId_version_key" ON "SkillVersion"("skillId", "version");

-- CreateIndex
CREATE INDEX "SkillPrice_skillId_isActive_idx" ON "SkillPrice"("skillId", "isActive");

-- CreateIndex
CREATE INDEX "SkillCategoryLink_categoryId_skillId_idx" ON "SkillCategoryLink"("categoryId", "skillId");

-- CreateIndex
CREATE INDEX "SkillIndustryLink_industryId_skillId_idx" ON "SkillIndustryLink"("industryId", "skillId");

-- CreateIndex
CREATE INDEX "SkillUseCaseLink_useCaseId_skillId_idx" ON "SkillUseCaseLink"("useCaseId", "skillId");

-- CreateIndex
CREATE INDEX "SkillToolLink_toolId_skillId_idx" ON "SkillToolLink"("toolId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "news_articles_slug_key" ON "news_articles"("slug");

-- CreateIndex
CREATE INDEX "news_articles_status_publishedAt_idx" ON "news_articles"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "news_articles_sourceName_idx" ON "news_articles"("sourceName");

-- CreateIndex
CREATE INDEX "news_articles_categoryId_status_idx" ON "news_articles"("categoryId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "news_categories_slug_key" ON "news_categories"("slug");

-- CreateIndex
CREATE INDEX "NewsToolLink_toolId_articleId_idx" ON "NewsToolLink"("toolId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "Ranking_slug_key" ON "Ranking"("slug");

-- CreateIndex
CREATE INDEX "Ranking_status_idx" ON "Ranking"("status");

-- CreateIndex
CREATE INDEX "Ranking_industryId_status_idx" ON "Ranking"("industryId", "status");

-- CreateIndex
CREATE INDEX "Ranking_categoryId_status_idx" ON "Ranking"("categoryId", "status");

-- CreateIndex
CREATE INDEX "RankingEntry_rankingId_rank_idx" ON "RankingEntry"("rankingId", "rank");

-- CreateIndex
CREATE INDEX "RankingEntry_toolId_idx" ON "RankingEntry"("toolId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingEntry_rankingId_toolId_key" ON "RankingEntry"("rankingId", "toolId");

-- CreateIndex
CREATE INDEX "SkillFavorite_skillId_createdAt_idx" ON "SkillFavorite"("skillId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillView_skillId_createdAt_idx" ON "SkillView"("skillId", "createdAt");

-- CreateIndex
CREATE INDEX "SkillView_userId_createdAt_idx" ON "SkillView"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ToolClick_toolId_createdAt_idx" ON "ToolClick"("toolId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderCode_key" ON "orders"("orderCode");

-- CreateIndex
CREATE INDEX "orders_userId_idx" ON "orders"("userId");

-- CreateIndex
CREATE INDEX "orders_skillId_idx" ON "orders"("skillId");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_createdAt_idx" ON "orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_providerTransactionId_key" ON "payment_transactions"("providerTransactionId");

-- CreateIndex
CREATE INDEX "payment_transactions_orderId_idx" ON "payment_transactions"("orderId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skill_accesses_orderId_key" ON "skill_accesses"("orderId");

-- CreateIndex
CREATE INDEX "skill_accesses_skillId_idx" ON "skill_accesses"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "skill_accesses_userId_skillId_key" ON "skill_accesses"("userId", "skillId");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_idx" ON "audit_logs"("actorUserId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillVersion" ADD CONSTRAINT "SkillVersion_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillPrice" ADD CONSTRAINT "SkillPrice_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillCategoryLink" ADD CONSTRAINT "SkillCategoryLink_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillCategoryLink" ADD CONSTRAINT "SkillCategoryLink_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "skill_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillIndustryLink" ADD CONSTRAINT "SkillIndustryLink_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillIndustryLink" ADD CONSTRAINT "SkillIndustryLink_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillUseCaseLink" ADD CONSTRAINT "SkillUseCaseLink_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillUseCaseLink" ADD CONSTRAINT "SkillUseCaseLink_useCaseId_fkey" FOREIGN KEY ("useCaseId") REFERENCES "UseCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillToolLink" ADD CONSTRAINT "SkillToolLink_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillToolLink" ADD CONSTRAINT "SkillToolLink_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AITool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_articles" ADD CONSTRAINT "news_articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "news_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsToolLink" ADD CONSTRAINT "NewsToolLink_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "news_articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsToolLink" ADD CONSTRAINT "NewsToolLink_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AITool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_industryId_fkey" FOREIGN KEY ("industryId") REFERENCES "industries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ranking" ADD CONSTRAINT "Ranking_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "skill_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_rankingId_fkey" FOREIGN KEY ("rankingId") REFERENCES "Ranking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEntry" ADD CONSTRAINT "RankingEntry_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AITool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillFavorite" ADD CONSTRAINT "SkillFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillFavorite" ADD CONSTRAINT "SkillFavorite_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillView" ADD CONSTRAINT "SkillView_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillView" ADD CONSTRAINT "SkillView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolClick" ADD CONSTRAINT "ToolClick_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "AITool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolClick" ADD CONSTRAINT "ToolClick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_accesses" ADD CONSTRAINT "skill_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_accesses" ADD CONSTRAINT "skill_accesses_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_accesses" ADD CONSTRAINT "skill_accesses_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
