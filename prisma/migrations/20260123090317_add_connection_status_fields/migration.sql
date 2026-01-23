-- AlterTable
ALTER TABLE "broker_accounts" ADD COLUMN     "disabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "disabledAt" TIMESTAMP(3),
ADD COLUMN     "disabledReason" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "lastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "authorizationId" TEXT;

-- CreateIndex
CREATE INDEX "broker_accounts_userId_disabled_idx" ON "broker_accounts"("userId", "disabled");
