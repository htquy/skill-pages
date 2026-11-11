-- Style chạy trên engine skill (frontmatter base:/base-layout:/tier: trong SKILL.md của feed SkillStudio).
-- Với base-layout overlay, file của engine được ghi vào catalog."SkillAsset" (kind = 'engine') cùng thư mục của style.
ALTER TABLE "catalog"."Skill"
  ADD COLUMN "baseSourceSlug" VARCHAR(180),
  ADD COLUMN "baseLayout"     VARCHAR(16),
  ADD COLUMN "sourceTier"     VARCHAR(24);
