import { PrismaClient } from '../../generated/prisma/client';

export async function seedServiceRecords(prisma: PrismaClient) {
  const technician = await prisma.user.findUniqueOrThrow({
    where: {
      email: 'technician@airtracer.local',
    },
  });

  const daikin = await prisma.asset.findUniqueOrThrow({
    where: {
      serialNumber: 'DAIKIN-DEMO-000001',
    },
  });

  const panasonic = await prisma.asset.findUniqueOrThrow({
    where: {
      serialNumber: 'PANASONIC-DEMO-000001',
    },
  });

  const lg = await prisma.asset.findUniqueOrThrow({
    where: {
      serialNumber: 'LG-DEMO-000001',
    },
  });

  const serviceRecords = [
    {
      assetId: daikin.id,
      technicianId: technician.id,
      serviceDate: new Date('2025-07-15'),
      serviceType: 'Preventive Maintenance',
      description:
        'Routine preventive maintenance including cleaning, inspection, and performance testing.',
      suctionPressure: 68.5,
      dischargePressure: 245.0,
      current: 4.2,
      voltage: 230,
      findings:
        'Unit operating normally. Filters were moderately dirty and indoor coil had light dust accumulation.',
      recommendations:
        'Clean filters regularly and schedule the next preventive maintenance within six months.',
    },
    {
      assetId: panasonic.id,
      technicianId: technician.id,
      serviceDate: new Date('2025-08-20'),
      serviceType: 'Inspection',
      description:
        'General inspection and operational testing of the air-conditioning unit.',
      suctionPressure: 70.0,
      dischargePressure: 238.5,
      current: 5.1,
      voltage: 230,
      findings:
        'Unit is operational. Minor dust accumulation found on the evaporator coil.',
      recommendations:
        'Perform coil cleaning during the next scheduled maintenance.',
    },
    {
      assetId: lg.id,
      technicianId: technician.id,
      serviceDate: new Date('2025-09-10'),
      serviceType: 'Repair',
      description:
        'Diagnostic inspection and repair following reported cooling performance issues.',
      suctionPressure: 58.0,
      dischargePressure: 220.0,
      current: 5.8,
      voltage: 230,
      findings:
        'Reduced cooling performance caused by restricted airflow from a heavily contaminated filter.',
      recommendations:
        'Replace or clean the air filter and monitor cooling performance after service.',
    },
  ];

  for (const serviceRecord of serviceRecords) {
    const existing = await prisma.serviceRecord.findFirst({
      where: {
        assetId: serviceRecord.assetId,
        serviceDate: serviceRecord.serviceDate,
        serviceType: serviceRecord.serviceType,
      },
    });

    if (!existing) {
      await prisma.serviceRecord.create({
        data: serviceRecord,
      });
    }
  }

  console.log(`✓ Seeded ${serviceRecords.length} service records`);
}
