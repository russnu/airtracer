import { Prisma } from '../../generated/prisma/client';

export const EQUIPMENT_TYPES = [
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
] as const;

export type EquipmentTypeName = (typeof EQUIPMENT_TYPES)[number]['name'];

export async function seedEquipmentTypes(
  tx: Prisma.TransactionClient,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();

  for (const { name, description } of EQUIPMENT_TYPES) {
    const type = await tx.equipmentType.upsert({
      where: { name },
      update: { description, isActive: true },
      create: { name, description },
    });

    ids.set(name, type.id);
  }

  console.log(`✓ Seeded ${EQUIPMENT_TYPES.length} equipment types`);

  return ids;
}
