import type { ServiceStatus } from "../../types/api";

type BadgeVariant = "success" | "warning" | "error" | "info";

export const SERVICE_STATUSES: ServiceStatus[] = [
  "PENDING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
];

export const serviceStatusStyles: Record<
  ServiceStatus,
  { label: string; node: string; badge: BadgeVariant }
> = {
  PENDING: {
    label: "Pending",
    node: "bg-white border-2 border-accent-500",
    badge: "info",
  },
  IN_PROGRESS: {
    label: "In progress",
    node: "bg-warning-500 ring-4 ring-warning-100",
    badge: "warning",
  },
  COMPLETED: {
    label: "Completed",
    node: "bg-success-500",
    badge: "success",
  },
  CANCELLED: {
    label: "Cancelled",
    node: "bg-white border-2 border-error-500",
    badge: "error",
  },
};

/** Badge variant matching the timeline node colour for a status. */
export function serviceStatusBadgeVariant(status: ServiceStatus): BadgeVariant {
  return serviceStatusStyles[status]?.badge ?? "info";
}

export function serviceStatusLabel(status: ServiceStatus): string {
  return serviceStatusStyles[status]?.label ?? status;
}

// Mirrors ALLOWED_STATUS_TRANSITIONS in the API, which enforces it; used here
// only to decide which actions to offer.
export const NEXT_SERVICE_STATUSES: Record<ServiceStatus, ServiceStatus[]> = {
  PENDING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};
