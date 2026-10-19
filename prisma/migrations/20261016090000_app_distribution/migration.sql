-- CreateTable
CREATE TABLE "apps"."app_sources" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "format" VARCHAR(10) NOT NULL,
    "platform" VARCHAR(40) NOT NULL,
    "url" TEXT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "fileName" VARCHAR(200) NOT NULL,
    "installDirectory" VARCHAR(240) NOT NULL,
    "entryPoint" VARCHAR(240) NOT NULL,
    "requiredFiles" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT NOT NULL DEFAULT '',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "app_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps"."app_releases" (
    "id" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "version" VARCHAR(40) NOT NULL,
    "channel" VARCHAR(20) NOT NULL DEFAULT 'stable',
    "platform" VARCHAR(40) NOT NULL DEFAULT 'win-x64',
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps"."app_release_items" (
    "releaseId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "app_release_items_pkey" PRIMARY KEY ("releaseId","sourceId")
);

-- CreateIndex
CREATE INDEX "app_sources_url_idx" ON "apps"."app_sources"("url");

-- CreateIndex
CREATE UNIQUE INDEX "app_sources_appId_key_version_platform_key" ON "apps"."app_sources"("appId", "key", "version", "platform");

-- CreateIndex
CREATE INDEX "app_releases_appId_channel_platform_status_idx" ON "apps"."app_releases"("appId", "channel", "platform", "status");

-- CreateIndex
CREATE UNIQUE INDEX "app_releases_appId_version_channel_platform_key" ON "apps"."app_releases"("appId", "version", "channel", "platform");

-- CreateIndex
CREATE INDEX "app_release_items_sourceId_idx" ON "apps"."app_release_items"("sourceId");

-- AddForeignKey
ALTER TABLE "apps"."app_sources" ADD CONSTRAINT "app_sources_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."app_releases" ADD CONSTRAINT "app_releases_appId_fkey" FOREIGN KEY ("appId") REFERENCES "apps"."apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."app_release_items" ADD CONSTRAINT "app_release_items_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "apps"."app_releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apps"."app_release_items" ADD CONSTRAINT "app_release_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "apps"."app_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
