import type { ServiceOutcome } from "../../types/api";

type BadgeVariant = "success" | "warning" | "error" | "neutral" | "default";

/** How a record is shown: its outcome, or that it was voided or predates outcomes. */
export type ServiceRecordState = ServiceOutcome | "NOT_RECORDED" | "VOIDED";

export const SERVICE_OUTCOMES: ServiceOutcome[] = [
  "RESOLVED",
  "FOLLOW_UP_NEEDED",
  "UNABLE_TO_COMPLETE",
];

export const serviceRecordStateStyles: Record<
  ServiceRecordState,
  { label: string; node: string; badge: BadgeVariant }
> = {
  RESOLVED: {
    label: "Resolved",
    node: "bg-success-500",
    badge: "success",
  },
  FOLLOW_UP_NEEDED: {
    label: "Follow-up needed",
    node: "bg-warning-500 ring-4 ring-warning-100",
    badge: "warning",
  },
  UNABLE_TO_COMPLETE: {
    label: "Unable to complete",
    node: "bg-error-500",
    badge: "error",
  },
  NOT_RECORDED: {
    label: "Outcome not recorded",
    node: "bg-primary-400",
    badge: "default",
  },
  VOIDED: {
    label: "Voided",
    node: "bg-white border-2 border-primary-400",
    badge: "neutral",
  },
};

/**
 * Voided wins over the outcome. Fields may be missing on passports saved on
 * the device before outcomes existed; they read as not recorded.
 */
export function serviceRecordState(record: {
  outcome?: ServiceOutcome | null;
  voidedAt?: string | null;
}): ServiceRecordState {
  if (record.voidedAt) return "VOIDED";
  return record.outcome ?? "NOT_RECORDED";
}

export function serviceRecordStateLabel(state: ServiceRecordState): string {
  return serviceRecordStateStyles[state]?.label ?? state;
}

/** Badge variant matching the timeline node colour for a state. */
export function serviceRecordStateBadgeVariant(
  state: ServiceRecordState,
): BadgeVariant {
  return serviceRecordStateStyles[state]?.badge ?? "default";
}
