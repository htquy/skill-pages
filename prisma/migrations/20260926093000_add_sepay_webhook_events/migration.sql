-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'MATCHED', 'REJECTED', 'FAILED');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "email" VARCHAR(320),
ADD COLUMN     "productType" VARCHAR(24) NOT NULL DEFAULT 'SKILL';

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "webhookEventId" TEXT;

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(60) NOT NULL,
    "providerEventId" VARCHAR(160) NOT NULL,
    "gateway" VARCHAR(120) NOT NULL,
    "accountNumber" VARCHAR(64) NOT NULL,
    "subAccount" VARCHAR(64),
    "amountIn" DECIMAL(18,2) NOT NULL,
    "accumulated" DECIMAL(18,2),
    "code" VARCHAR(120),
    "content" TEXT,
    "transferType" VARCHAR(16),
    "referenceNumber" VARCHAR(120),
    "referenceCode" VARCHAR(120),
    "description" TEXT,
    "transactionDate" VARCHAR(40),
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "failureReason" VARCHAR(200),
    "orderId" TEXT,
    "orderCode" VARCHAR(40),
    "rawPayload" JSONB NOT NULL,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_providerEventId_key" ON "webhook_events"("provider", "providerEventId");

-- CreateIndex
CREATE INDEX "webhook_events_status_receivedAt_idx" ON "webhook_events"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "webhook_events_orderId_idx" ON "webhook_events"("orderId");

-- CreateIndex
CREATE INDEX "webhook_events_referenceNumber_idx" ON "webhook_events"("referenceNumber");

-- CreateIndex
CREATE INDEX "webhook_events_receivedAt_idx" ON "webhook_events"("receivedAt");

-- CreateIndex
CREATE INDEX "orders_status_expiresAt_idx" ON "orders"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "payment_transactions_webhookEventId_idx" ON "payment_transactions"("webhookEventId");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "webhook_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
