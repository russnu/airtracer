/*
  Warnings:

  - You are about to drop the column `qrCode` on the `Asset` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Asset_qrCode_key";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "qrCode";

-- CreateTable
CREATE TABLE "QRCode" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_token_key" ON "QRCode"("token");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_assetId_key" ON "QRCode"("assetId");

-- CreateIndex
CREATE INDEX "QRCode_token_idx" ON "QRCode"("token");

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
