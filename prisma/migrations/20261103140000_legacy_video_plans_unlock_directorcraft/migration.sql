-- Gói "Video Tool 1 Tháng / 1 Năm" bán trước khi app đổi thành DirectorCraft chỉ có mã tính năng cũ
-- (VIDEO_BATCH, VIDEO_GPU...) mà không menu nào còn yêu cầu, nên người mua còn hạn vẫn bị khóa Cinema 2D/Motion/Auto-Clip.
-- Cấp cho các gói cũ đủ tính năng DirectorCraft hiện tại. Idempotent, bỏ qua nếu gói/tính năng chưa tồn tại.
INSERT INTO "apps"."plan_features" ("planId", "featureId")
SELECT p."id", f."id"
FROM "apps"."subscription_plans" p
CROSS JOIN "apps"."features" f
WHERE p."id" IN ('plan-video-month', 'plan-video-year')
  AND f."key" IN ('DC_CINEMA_2D', 'DC_MOTION_2D', 'DC_AUTOCLIP')
ON CONFLICT DO NOTHING;
