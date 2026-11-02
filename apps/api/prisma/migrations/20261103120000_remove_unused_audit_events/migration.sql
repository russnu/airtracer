-- Remove audit entries for events that are no longer written: the removed
-- status workflow (UPDATED, COMPLETED, CANCELLED) and the never-implemented
-- asset assignment events. On assets that keep other entries, this leaves a
-- gap in the hash chain where these entries were.
DELETE FROM "AuditLog" WHERE "event" IN (
  'ASSET_ASSIGNED',
  'ASSET_OWNERSHIP_CHANGED',
  'SERVICE_RECORD_UPDATED',
  'SERVICE_RECORD_COMPLETED',
  'SERVICE_RECORD_CANCELLED'
);

-- AlterEnum
BEGIN;
CREATE TYPE "Event_new" AS ENUM ('ASSET_CREATED', 'ASSET_UPDATED', 'ASSET_DEACTIVATED', 'SERVICE_RECORD_CREATED', 'SERVICE_RECORD_VOIDED', 'QR_GENERATED', 'QR_REGENERATED', 'QR_DEACTIVATED', 'SERVICE_PHOTO_ADDED', 'SERVICE_PHOTO_REMOVED');
ALTER TABLE "AuditLog" ALTER COLUMN "event" TYPE "Event_new" USING ("event"::text::"Event_new");
ALTER TYPE "Event" RENAME TO "Event_old";
ALTER TYPE "Event_new" RENAME TO "Event";
DROP TYPE "Event_old";
COMMIT;
