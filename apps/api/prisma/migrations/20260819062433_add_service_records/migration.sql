-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN     "current" DOUBLE PRECISION,
ADD COLUMN     "dischargePressure" DOUBLE PRECISION,
ADD COLUMN     "findings" TEXT,
ADD COLUMN     "recommendations" TEXT,
ADD COLUMN     "suctionPressure" DOUBLE PRECISION,
ADD COLUMN     "voltage" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ServicePhoto" (
    "id" TEXT NOT NULL,
    "serviceRecordId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "caption" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServicePhoto_serviceRecordId_idx" ON "ServicePhoto"("serviceRecordId");

-- AddForeignKey
ALTER TABLE "ServicePhoto" ADD CONSTRAINT "ServicePhoto_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
