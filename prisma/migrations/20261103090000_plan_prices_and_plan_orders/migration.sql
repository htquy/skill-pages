-- Gói = tầng tính năng, giá/kỳ hạn tách sang subscription_plan_prices (1/6/12 tháng, vĩnh viễn).
-- Đơn hàng bán được cả SKILL lẫn APP_PLAN. Dữ liệu cũ được chuyển, không mất gói nào.

-- 1) Bảng giá theo kỳ hạn
CREATE TABLE "apps"."subscription_plan_prices" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'VND',
    "amount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "subscription_plan_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "subscription_plan_prices_planId_isActive_idx" ON "apps"."subscription_plan_prices"("planId", "isActive");
CREATE UNIQUE INDEX "subscription_plan_prices_planId_months_currency_key" ON "apps"."subscription_plan_prices"("planId", "months", "currency");
ALTER TABLE "apps"."subscription_plan_prices" ADD CONSTRAINT "subscription_plan_prices_planId_fkey" FOREIGN KEY ("planId") REFERENCES "apps"."subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 2) Chuyển giá cũ: mỗi gói cũ thành một kỳ hạn. 30 ngày -> 1 tháng, 90 -> 3, 180 -> 6, 365 -> 12, 0 -> vĩnh viễn.
INSERT INTO "apps"."subscription_plan_prices" ("id", "planId", "months", "currency", "amount", "isActive", "createdAt", "updatedAt")
SELECT "id" || '-price', "id",
       CASE WHEN "durationDays" <= 0 THEN 0 ELSE GREATEST(1, ROUND("durationDays" / 30.0)::INTEGER) END,
       "currency", "price", "isActive", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "apps"."subscription_plans";

-- 3) Bỏ các cột giá/chu kỳ đã chuyển
ALTER TABLE "apps"."subscription_plans" DROP COLUMN "currency",
DROP COLUMN "durationDays",
DROP COLUMN "interval",
DROP COLUMN "price",
ADD COLUMN     "sortOrder" INTEGER NOT NULL DEFAULT 0;

DROP TYPE "apps"."SubscriptionInterval";

-- 4) Mỗi đơn hàng tạo tối đa một kỳ đăng ký (webhook gửi lặp không cộng thời hạn hai lần)
CREATE UNIQUE INDEX "user_subscriptions_orderId_key" ON "apps"."user_subscriptions"("orderId");

-- 5) Đơn hàng mua gói
ALTER TABLE "payment"."orders" ADD COLUMN     "planPriceId" VARCHAR(64),
ADD COLUMN     "productPath" VARCHAR(240),
ADD COLUMN     "productTitle" VARCHAR(240),
ALTER COLUMN "skillId" DROP NOT NULL;

CREATE INDEX "orders_planPriceId_idx" ON "payment"."orders"("planPriceId");
