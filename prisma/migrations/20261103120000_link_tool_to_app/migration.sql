-- Liên kết trang giới thiệu (catalog.tools) với sản phẩm bán gói (apps.apps) bằng slug.
-- Tham chiếu mềm, không FK vì hai bảng thuộc hai module khác nhau.
ALTER TABLE "catalog"."tools" ADD COLUMN "appSlug" VARCHAR(160);
CREATE INDEX "tools_appSlug_idx" ON "catalog"."tools"("appSlug");
