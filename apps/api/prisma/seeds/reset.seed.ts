import { Prisma } from '../../generated/prisma/client';

export interface ResetResult {
  servicePhotos: number;
  serviceRecords: number;
  auditLogs: number;
  qrCodes: number;
  assets: number;
  orphanedStorageKeys: string[];
}

// Deletes all non-user data, children before parents. Users, user roles and
// roles are never touched.
export async function resetSampleData(
  tx: Prisma.TransactionClient,
): Promise<ResetResult> {
  const photos = await tx.servicePhoto.findMany({
    select: { storageKey: true },
  });

  const servicePhotos = await tx.servicePhoto.deleteMany({});
  const serviceRecords = await tx.serviceRecord.deleteMany({});
  const auditLogs = await tx.auditLog.deleteMany({});
  const qrCodes = await tx.qRCode.deleteMany({});
  const assets = await tx.asset.deleteMany({});

  return {
    servicePhotos: servicePhotos.count,
    serviceRecords: serviceRecords.count,
    auditLogs: auditLogs.count,
    qrCodes: qrCodes.count,
    assets: assets.count,
    orphanedStorageKeys: photos.map((photo) => photo.storageKey),
  };
}
