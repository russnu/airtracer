-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN     "clientRequestId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRecord_clientRequestId_key" ON "ServiceRecord"("clientRequestId");
