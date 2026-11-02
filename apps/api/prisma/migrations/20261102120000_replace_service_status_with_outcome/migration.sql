-- CreateEnum
CREATE TYPE "ServiceOutcome" AS ENUM ('RESOLVED', 'FOLLOW_UP_NEEDED', 'UNABLE_TO_COMPLETE');

-- AlterEnum
ALTER TYPE "Event" ADD VALUE 'SERVICE_RECORD_VOIDED';

-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN     "outcome" "ServiceOutcome",
ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3);

-- Migrate data: cancelled records become voided, at the time they were last
-- changed. Other records keep a null outcome: a closed job does not say
-- whether the problem was resolved, so no outcome is inferred.
UPDATE "ServiceRecord" SET "voidedAt" = "updatedAt" WHERE "status" = 'CANCELLED';

-- AlterTable
ALTER TABLE "ServiceRecord" DROP COLUMN "status";

-- DropEnum
DROP TYPE "ServiceStatus";
