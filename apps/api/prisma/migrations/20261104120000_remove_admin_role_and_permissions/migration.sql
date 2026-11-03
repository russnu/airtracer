-- AirTracer has two roles, OWNER and TECHNICIAN. ADMIN is removed, and the
-- permission tables are dropped because authorization checks role names only.

-- Deactivate the demo administrator and any account whose only role is
-- ADMIN, so no active account is left without a role. Their audit entries
-- keep their actorId because the users are not deleted.
UPDATE "User"
SET "isActive" = false, "updatedAt" = CURRENT_TIMESTAMP
WHERE "email" = 'admin@airtracer.local'
   OR "id" IN (
     SELECT ur."userId"
     FROM "UserRole" ur
     JOIN "Role" r ON r."id" = ur."roleId"
     GROUP BY ur."userId"
     HAVING bool_and(r."name" = 'ADMIN')
   );

-- Deleting the role cascades to its UserRole and RolePermission rows.
DELETE FROM "Role" WHERE "name" = 'ADMIN';

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_permissionId_fkey";

-- DropForeignKey
ALTER TABLE "RolePermission" DROP CONSTRAINT "RolePermission_roleId_fkey";

-- DropTable
DROP TABLE "RolePermission";

-- DropTable
DROP TABLE "Permission";

-- Registration assigns roles by name, so a fresh database needs both rows.
INSERT INTO "Role" ("id", "name", "description", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'OWNER', 'Manages owned assets and views their service history', CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'TECHNICIAN', 'Records and voids maintenance service records', CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
