import type { ReactNode } from "react";
import type { ServiceStatus } from "../../types/api";
import { EmptyState } from "../ui/EmptyState";
import { serviceStatusStyles } from "./serviceStatus";

interface ServiceTimelineProps<T extends { id: string; serviceDate: string }> {
  records: T[];
  renderRecord: (record: T) => ReactNode;
  /** Records without a status (e.g. public passport history) get a neutral node. */
  getStatus?: (record: T) => ServiceStatus | undefined;
  emptyState?: ReactNode;
}

export function ServiceTimeline<T extends { id: string; serviceDate: string }>({
  records,
  renderRecord,
  getStatus,
  emptyState,
}: ServiceTimelineProps<T>) {
  if (records.length === 0) {
    return (
      <>
        {emptyState ?? (
          <EmptyState
            title="No service records"
            description="This equipment has not been serviced yet."
          />
        )}
      </>
    );
  }

  // Newest first, regardless of the order the API returned.
  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime(),
  );

  return (
    <ol className="relative">
      {sorted.map((record, index) => {
        const isLast = index === sorted.length - 1;
        const date = new Date(record.serviceDate);
        const status = getStatus?.(record);
        const style = status ? serviceStatusStyles[status] : undefined;

        return (
          <li key={record.id} className="flex gap-3 sm:gap-4">
            {/* Date */}
            <time
              dateTime={record.serviceDate}
              className="w-14 sm:w-20 shrink-0 text-right pt-0.5"
            >
              <span className="block text-sm font-semibold text-primary-800 leading-tight">
                {date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="block text-xs text-primary-400">
                {date.getFullYear()}
              </span>
            </time>

            {/* Node + connector */}
            <div className="flex flex-col items-center shrink-0">
              <span
                className={`mt-1.5 h-3 w-3 rounded-full shrink-0 ${
                  style?.node ?? "bg-primary-400"
                }`}
                title={style?.label}
              >
                {style && <span className="sr-only">{style.label}</span>}
              </span>
              {!isLast && <span className="mt-1.5 w-px flex-1 bg-primary-200" />}
            </div>

            {/* Details */}
            <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-6"}`}>
              {renderRecord(record)}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
