import { Event, Prisma } from '../../generated/prisma/client';
import { computeAuditHash } from '../../src/audit/utils/audit-hash.util';
import { generateQrToken } from '../../src/qr/utils/qr.util';

import { SAMPLE_ASSETS, SampleAsset } from './sample-data';

interface AuditEntry {
  actorId: string;
  event: Event;
  payload: Prisma.InputJsonObject;
}

// One change on an asset's timeline. apply() makes the change and returns the
// audit entry the API would have written for it.
interface Step {
  at: Date;
  apply: () => Promise<AuditEntry>;
}

export interface SampleDataResult {
  assets: number;
  qrCodes: number;
  serviceRecords: number;
  auditLogs: number;
}

export async function seedSampleData(
  tx: Prisma.TransactionClient,
  ids: {
    ownerId: string;
    technicianId: string;
  },
): Promise<SampleDataResult> {
  const result: SampleDataResult = {
    assets: 0,
    qrCodes: 0,
    serviceRecords: 0,
    auditLogs: 0,
  };

  for (const sample of SAMPLE_ASSETS) {
    const createdAt = new Date(sample.createdAt);

    const asset = await tx.asset.create({
      data: {
        brand: sample.brand,
        model: sample.model,
        serialNumber: sample.serialNumber,
        equipmentType: sample.equipmentType,
        refrigerant: sample.refrigerant,
        capacity: sample.capacity,
        capacityUnit: sample.capacityUnit,
        installationDate: sample.installationDate
          ? new Date(sample.installationDate)
          : null,
        location: sample.location,
        ownerId: ids.ownerId,
        createdAt,
        updatedAt: createdAt,
      },
    });
    result.assets++;

    // Payload shapes match AssetsService, QrService and ServiceRecordsService.
    const steps: Step[] = [
      {
        at: createdAt,
        apply: () =>
          Promise.resolve({
            actorId: ids.ownerId,
            event: Event.ASSET_CREATED,
            payload: {
              brand: asset.brand,
              model: asset.model,
              serialNumber: asset.serialNumber,
              equipmentType: asset.equipmentType,
              refrigerant: asset.refrigerant,
              capacity: asset.capacity,
              capacityUnit: asset.capacityUnit,
              installationDate: asset.installationDate?.toISOString() ?? null,
              location: asset.location,
              ownerId: asset.ownerId,
            },
          }),
      },
      ...buildFollowUpSteps(tx, sample, asset.id, ids, result),
    ];

    steps.sort((a, b) => a.at.getTime() - b.at.getTime());
    assertDistinctTimes(steps, sample);

    let previousHash: string | null = null;

    for (const step of steps) {
      const entry = await step.apply();

      const hash = computeAuditHash({
        actorId: entry.actorId,
        assetId: asset.id,
        event: entry.event,
        payload: entry.payload,
        previousHash,
        createdAt: step.at,
      });

      await tx.auditLog.create({
        data: {
          actorId: entry.actorId,
          assetId: asset.id,
          event: entry.event,
          payload: entry.payload,
          previousHash,
          hash,
          createdAt: step.at,
        },
      });

      previousHash = hash;
      result.auditLogs++;
    }
  }

  console.log(
    `✓ Seeded ${result.assets} assets, ${result.qrCodes} QR codes, ` +
      `${result.serviceRecords} service records, ${result.auditLogs} audit logs`,
  );

  return result;
}

function buildFollowUpSteps(
  tx: Prisma.TransactionClient,
  sample: SampleAsset,
  assetId: string,
  ids: { ownerId: string; technicianId: string },
  result: SampleDataResult,
): Step[] {
  const steps: Step[] = [];

  if (sample.qrGeneratedAt) {
    const at = new Date(sample.qrGeneratedAt);

    steps.push({
      at,
      apply: async () => {
        const qrCode = await tx.qRCode.create({
          data: {
            token: generateQrToken(),
            assetId,
            generatedAt: at,
            createdAt: at,
            updatedAt: at,
          },
        });
        result.qrCodes++;

        return {
          actorId: ids.ownerId,
          event: Event.QR_GENERATED,
          payload: {
            qrCodeId: qrCode.id,
            token: qrCode.token,
            generatedAt: qrCode.generatedAt.toISOString(),
          },
        };
      },
    });
  }

  const { locationChange } = sample;

  if (locationChange) {
    const at = new Date(locationChange.at);

    steps.push({
      at,
      apply: async () => {
        await tx.asset.update({
          where: { id: assetId },
          data: { location: locationChange.to, updatedAt: at },
        });

        return {
          actorId: ids.ownerId,
          event: Event.ASSET_UPDATED,
          payload: {
            changes: {
              location: { from: sample.location, to: locationChange.to },
            },
          },
        };
      },
    });
  }

  for (const record of sample.serviceRecords) {
    const recordedAt = new Date(record.recordedAt);
    let serviceRecordId: string | null = null;

    steps.push({
      at: recordedAt,
      apply: async () => {
        const created = await tx.serviceRecord.create({
          data: {
            assetId,
            technicianId: ids.technicianId,
            serviceDate: new Date(record.serviceDate),
            serviceType: record.serviceType,
            description: record.description,
            outcome: record.outcome,
            suctionPressure: record.suctionPressure,
            dischargePressure: record.dischargePressure,
            current: record.current,
            voltage: record.voltage,
            returnAirTemp: record.returnAirTemp,
            supplyAirTemp: record.supplyAirTemp,
            findings: record.findings,
            recommendations: record.recommendations,
            clientRequestId: record.clientRequestId,
            createdAt: recordedAt,
            updatedAt: recordedAt,
          },
        });
        serviceRecordId = created.id;
        result.serviceRecords++;

        return {
          actorId: ids.technicianId,
          event: Event.SERVICE_RECORD_CREATED,
          payload: {
            serviceRecordId: created.id,
            serviceDate: created.serviceDate.toISOString(),
            serviceType: created.serviceType,
            description: created.description,
            outcome: created.outcome,
            suctionPressure: created.suctionPressure,
            dischargePressure: created.dischargePressure,
            current: created.current,
            voltage: created.voltage,
            returnAirTemp: created.returnAirTemp,
            supplyAirTemp: created.supplyAirTemp,
            findings: created.findings,
            recommendations: created.recommendations,
            clientRequestId: created.clientRequestId,
            clientCapturedAt: null,
          },
        };
      },
    });

    const { voided } = record;

    if (voided) {
      const at = new Date(voided.at);

      steps.push({
        at,
        apply: async () => {
          if (!serviceRecordId) {
            throw new Error('A record must be created before it is voided');
          }

          await tx.serviceRecord.update({
            where: { id: serviceRecordId },
            data: { voidedAt: at, voidReason: voided.reason, updatedAt: at },
          });

          return {
            actorId: ids.technicianId,
            event: Event.SERVICE_RECORD_VOIDED,
            payload: { serviceRecordId, reason: voided.reason },
          };
        },
      });
    }
  }

  if (sample.deactivatedAt) {
    const at = new Date(sample.deactivatedAt);

    steps.push({
      at,
      apply: async () => {
        await tx.asset.update({
          where: { id: assetId },
          data: { isActive: false, updatedAt: at },
        });

        return {
          actorId: ids.ownerId,
          event: Event.ASSET_DEACTIVATED,
          payload: { previousStatus: true, newStatus: false },
        };
      },
    });
  }

  return steps;
}

// Equal timestamps would make the chain order ambiguous, and a service record
// after deactivation is something the API rejects.
function assertDistinctTimes(steps: Step[], sample: SampleAsset) {
  const times = steps.map((step) => step.at.getTime());

  if (new Set(times).size !== times.length) {
    throw new Error(`Sample asset ${sample.model} has two steps at one time`);
  }

  if (sample.deactivatedAt) {
    const deactivatedAt = new Date(sample.deactivatedAt).getTime();

    if (
      sample.serviceRecords.some(
        (record) => new Date(record.recordedAt).getTime() > deactivatedAt,
      )
    ) {
      throw new Error(
        `Sample asset ${sample.model} has a service record after deactivation`,
      );
    }
  }
}
