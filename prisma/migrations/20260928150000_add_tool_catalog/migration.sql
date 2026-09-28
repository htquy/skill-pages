-- CreateEnum
CREATE TYPE "ToolType" AS ENUM ('DOWNLOADABLE', 'EMBED_WIDGET', 'MCP_SERVER', 'WEB_APP');

-- CreateEnum
CREATE TYPE "ToolBillingType" AS ENUM ('FREE', 'ONE_TIME', 'SUBSCRIPTION');

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "shortDescription" VARCHAR(500) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ToolType" NOT NULL DEFAULT 'DOWNLOADABLE',
    "billingType" "ToolBillingType" NOT NULL DEFAULT 'SUBSCRIPTION',
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "coverImageUrl" TEXT,
    "videoDemoUrl" TEXT,
    "config" JSONB,
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_prices" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "amount" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_versions" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "versionCode" VARCHAR(50) NOT NULL,
    "changelog" TEXT,
    "fileUrl" TEXT,
    "fileName" VARCHAR(200),
    "fileSize" BIGINT,
    "scriptUrl" TEXT,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tool_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tools_slug_key" ON "tools"("slug");

-- CreateIndex
CREATE INDEX "tools_status_publishedAt_idx" ON "tools"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "tools_type_status_idx" ON "tools"("type", "status");

-- CreateIndex
CREATE INDEX "tools_billingType_idx" ON "tools"("billingType");

-- CreateIndex
CREATE INDEX "tool_prices_toolId_isActive_idx" ON "tool_prices"("toolId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "tool_versions_toolId_versionCode_key" ON "tool_versions"("toolId", "versionCode");

-- CreateIndex
CREATE INDEX "tool_versions_toolId_isLatest_idx" ON "tool_versions"("toolId", "isLatest");

-- AddForeignKey
ALTER TABLE "tool_prices" ADD CONSTRAINT "tool_prices_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_versions" ADD CONSTRAINT "tool_versions_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
