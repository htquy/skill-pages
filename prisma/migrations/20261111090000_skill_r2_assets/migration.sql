-- Skill lấy từ feed R2 của SkillStudio: lưu đường dẫn thư mục / file trên R2 thay vì chỉ text.

-- 1) Cột mới trên catalog."Skill"
ALTER TABLE "catalog"."Skill"
  ADD COLUMN "sourceSlug"      VARCHAR(180),
  ADD COLUMN "r2Prefix"        TEXT,
  ADD COLUMN "posterKey"       TEXT,
  ADD COLUMN "previewVideoKey" TEXT,
  ADD COLUMN "sourceRevision"  VARCHAR(40),
  ADD COLUMN "translations"    JSONB;

CREATE UNIQUE INDEX "Skill_sourceSlug_key" ON "catalog"."Skill"("sourceSlug");

-- 2) Từng file trong thư mục skill trên R2
CREATE TABLE "catalog"."SkillAsset" (
    "id"          TEXT NOT NULL,
    "skillId"     TEXT NOT NULL,
    "path"        VARCHAR(512) NOT NULL,
    "r2Key"       TEXT NOT NULL,
    "kind"        VARCHAR(24) NOT NULL,
    "contentType" VARCHAR(120),
    "sizeBytes"   BIGINT NOT NULL,
    "sha256"      CHAR(64) NOT NULL,
    "createdAt"   TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SkillAsset_skillId_path_key" ON "catalog"."SkillAsset"("skillId", "path");
CREATE INDEX "SkillAsset_skillId_kind_idx" ON "catalog"."SkillAsset"("skillId", "kind");
ALTER TABLE "catalog"."SkillAsset"
  ADD CONSTRAINT "SkillAsset_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "catalog"."Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
