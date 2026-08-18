import { PrismaClient } from '../../generated/prisma/client';
import { generateQrToken } from '../../src/qr/utils/qr.util';

export async function seedQRCodes(prisma: PrismaClient) {
  const assets = await prisma.asset.findMany({
    where: {
      serialNumber: {
        in: ['DAIKIN-DEMO-000001', 'PANASONIC-DEMO-000001', 'LG-DEMO-000001'],
      },
    },
  });

  const assetBySerialNumber = new Map(
    assets.map((asset) => [asset.serialNumber, asset]),
  );

  const serialNumbers = [
    'DAIKIN-DEMO-000001',
    'PANASONIC-DEMO-000001',
    'LG-DEMO-000001',
  ];

  for (const serialNumber of serialNumbers) {
    const asset = assetBySerialNumber.get(serialNumber);

    if (!asset) {
      throw new Error(`Asset not found for serial number: ${serialNumber}`);
    }

    const existingQrCode = await prisma.qRCode.findUnique({
      where: {
        assetId: asset.id,
      },
    });

    if (existingQrCode) {
      continue;
    }

    await prisma.qRCode.create({
      data: {
        token: generateQrToken(),
        assetId: asset.id,
      },
    });
  }

  console.log(`✓ Seeded QR codes for ${serialNumbers.length} assets`);
}
