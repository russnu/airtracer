import { PrismaClient } from '../../generated/prisma/client';

export async function seedEquipmentTypes(prisma: PrismaClient) {
  const equipmentTypes = [
    {
      name: 'Window-Type',
      description:
        'Air conditioning unit designed to be installed in a window opening.',
    },
    {
      name: 'Wall-Mounted Split-Type',
      description:
        'Split-type air conditioning unit with the indoor unit mounted on a wall.',
    },
    {
      name: 'Floor-Mounted Split-Type',
      description:
        'Split-type air conditioning unit with the indoor unit installed on the floor.',
    },
    {
      name: 'Ceiling Cassette',
      description:
        'Air conditioning unit installed within or mounted to a ceiling, typically with four-way airflow.',
    },
    {
      name: 'Ceiling Suspended',
      description:
        'Air conditioning unit suspended from the ceiling for spaces where wall or ceiling installation is unsuitable.',
    },
    {
      name: 'Ducted Split-Type',
      description:
        'Split-type air conditioning system that distributes conditioned air through ductwork.',
    },
    {
      name: 'Portable',
      description:
        'Portable air conditioning unit designed to be moved between locations.',
    },
    {
      name: 'Package-Type',
      description:
        'Self-contained air conditioning system with major components housed in a single unit.',
    },
  ];

  await prisma.equipmentType.createMany({
    data: equipmentTypes,
    skipDuplicates: true,
  });

  console.log(`✓ Seeded ${equipmentTypes.length} equipment types`);
}
