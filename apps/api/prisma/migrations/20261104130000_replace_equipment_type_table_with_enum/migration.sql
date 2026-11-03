-- Equipment types become a fixed enum instead of a table. Each asset's type is
-- mapped by name; the migration stops if an asset uses a name outside the
-- eight known types, rather than guessing.
--
-- Audit entries written before this migration keep their equipmentTypeId
-- values. Those IDs no longer resolve, but the entries are not rewritten
-- because their payloads are part of the tamper-evident hash chain.

BEGIN;

-- The table already uses the name "EquipmentType", so the enum is created
-- under a temporary name and renamed once the table is dropped.
CREATE TYPE "EquipmentType_new" AS ENUM (
  'WINDOW_TYPE',
  'WALL_MOUNTED_SPLIT',
  'FLOOR_MOUNTED_SPLIT',
  'CEILING_CASSETTE',
  'CEILING_SUSPENDED',
  'DUCTED_SPLIT',
  'PORTABLE',
  'PACKAGE_TYPE'
);

ALTER TABLE "Asset" ADD COLUMN "equipmentType" "EquipmentType_new";

UPDATE "Asset" a
SET "equipmentType" = (
  CASE et."name"
    WHEN 'Window-Type' THEN 'WINDOW_TYPE'
    WHEN 'Wall-Mounted Split-Type' THEN 'WALL_MOUNTED_SPLIT'
    WHEN 'Floor-Mounted Split-Type' THEN 'FLOOR_MOUNTED_SPLIT'
    WHEN 'Ceiling Cassette' THEN 'CEILING_CASSETTE'
    WHEN 'Ceiling Suspended' THEN 'CEILING_SUSPENDED'
    WHEN 'Ducted Split-Type' THEN 'DUCTED_SPLIT'
    WHEN 'Portable' THEN 'PORTABLE'
    WHEN 'Package-Type' THEN 'PACKAGE_TYPE'
  END
)::"EquipmentType_new"
FROM "EquipmentType" et
WHERE et."id" = a."equipmentTypeId";

DO $$
DECLARE
  unmapped TEXT;
BEGIN
  SELECT string_agg(DISTINCT et."name", ', ')
  INTO unmapped
  FROM "Asset" a
  JOIN "EquipmentType" et ON et."id" = a."equipmentTypeId"
  WHERE a."equipmentType" IS NULL;

  IF unmapped IS NOT NULL THEN
    RAISE EXCEPTION 'Assets use equipment types with no enum value: %', unmapped;
  END IF;
END $$;

ALTER TABLE "Asset" ALTER COLUMN "equipmentType" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Asset" DROP CONSTRAINT "Asset_equipmentTypeId_fkey";

-- DropIndex
DROP INDEX "Asset_equipmentTypeId_idx";

-- AlterTable
ALTER TABLE "Asset" DROP COLUMN "equipmentTypeId";

-- DropTable
DROP TABLE "EquipmentType";

ALTER TYPE "EquipmentType_new" RENAME TO "EquipmentType";

-- CreateIndex
CREATE INDEX "Asset_equipmentType_idx" ON "Asset"("equipmentType");

COMMIT;
