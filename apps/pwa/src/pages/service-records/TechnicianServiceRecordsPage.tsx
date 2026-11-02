import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  PiCaretRightBold,
  PiImageBold,
  PiMapPinBold,
  PiQrCodeBold,
} from "react-icons/pi";
import { isNetworkError, serviceRecordsApi } from "../../lib/api-client";
import { useAuth } from "../../contexts/AuthContext";
import { useOutbox } from "../../hooks/useOutbox";
import type { TechnicianServiceRecord } from "../../types/api";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Spinner,
} from "../../components/ui";
import {
  SERVICE_OUTCOMES,
  serviceRecordState,
  serviceRecordStateBadgeVariant,
  serviceRecordStateLabel,
  serviceRecordStateStyles,
  type ServiceRecordState,
} from "../../components/service-records/serviceOutcome";

type StatusFilter = ServiceRecordState | "ALL";

function matchesSearch(record: TechnicianServiceRecord, query: string) {
  if (!query) return true;
  const { asset } = record;
  return [
    record.serviceType,
    record.description,
    asset.brand,
    asset.model,
    asset.serialNumber,
    asset.location,
  ].some((value) => value?.toLowerCase().includes(query));
}

export function TechnicianServiceRecordsPage() {
  const { user } = useAuth();
  const { items: outboxItems } = useOutbox();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const {
    data: records = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["service-records", "mine", user?.id],
    queryFn: () => serviceRecordsApi.findMine(),
    enabled: !!user,
  });

  const query = search.trim().toLowerCase();
  const searched = useMemo(
    () => records.filter((record) => matchesSearch(record, query)),
    [records, query],
  );
  const visible =
    statusFilter === "ALL"
      ? searched
      : searched.filter((record) => serviceRecordState(record) === statusFilter);
  const monthGroups = groupByMonth(visible);

  const countFor = (status: StatusFilter) =>
    status === "ALL"
      ? searched.length
      : searched.filter((record) => serviceRecordState(record) === status)
          .length;

  // "Outcome not recorded" only applies to older records, so its chip is
  // shown only while some exist.
  const filters: StatusFilter[] = [
    "ALL",
    ...SERVICE_OUTCOMES,
    ...(records.some((r) => serviceRecordState(r) === "NOT_RECORDED")
      ? (["NOT_RECORDED"] as const)
      : []),
    "VOIDED",
  ];

  const unsynced = outboxItems.filter((item) => item.status !== "synced");
  const isFiltered = query !== "" || statusFilter !== "ALL";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="Service Records"
        description="Records you have created, newest first."
        action={
          <Link to="/scan">
            <Button icon={<PiQrCodeBold className="w-4 h-4" />}>Scan QR</Button>
          </Link>
        }
      />

      {/* Records saved on this device but not uploaded yet */}
      {unsynced.length > 0 && (
        <section>
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <h2 className="text-sm font-semibold text-brand-tertiary">
              Not uploaded yet ({unsynced.length})
            </h2>
            <Link to="/sync" className="text-sm text-accent-700 underline">
              View pending sync
            </Link>
          </div>
          <ul className="space-y-2">
            {unsynced.map((item) => (
              <li key={item.clientRequestId}>
                <Card
                  padding="sm"
                  className="flex flex-wrap items-center justify-between gap-2 border-dashed"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-primary-900">
                      {item.payload.serviceType}
                    </p>
                    <p className="text-sm text-primary-500">
                      {item.assetLabel ?? "Unknown unit"} ·{" "}
                      {new Date(item.payload.serviceDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      item.status === "needs_attention"
                        ? "text-error-700"
                        : "text-warning-600"
                    }`}
                  >
                    {item.status === "needs_attention"
                      ? "Needs attention"
                      : "Waiting to sync"}
                  </span>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Filters */}
      <section className="space-y-3">
        <Input
          id="service-record-search"
          type="search"
          label="Search"
          placeholder="Service type, unit, serial number, or notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div
          role="group"
          aria-label="Filter by outcome"
          className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {filters.map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={isActive}
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-2 shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-accent-600 bg-accent-600 text-white"
                    : "border-primary-300 bg-white text-primary-700 hover:bg-primary-50"
                }`}
              >
                {status !== "ALL" && (
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${serviceRecordStateStyles[status].node}`}
                    aria-hidden="true"
                  />
                )}
                {status === "ALL" ? "All" : serviceRecordStateLabel(status)}
                <span
                  className={`text-xs ${isActive ? "text-accent-100" : "text-primary-400"}`}
                >
                  {countFor(status)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* History */}
      <section>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <Alert
            variant={isNetworkError(error) ? "warning" : "error"}
            title={isNetworkError(error) ? "You're offline" : "Error"}
          >
            {isNetworkError(error)
              ? "Your service records will load when the connection returns."
              : "Failed to load your service records."}
          </Alert>
        ) : monthGroups.length === 0 ? (
          <Card padding="sm" className="sm:p-6">
            {isFiltered ? (
              <EmptyState
                title="No matching records"
                description="Try a different search or outcome."
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                    }}
                  >
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="No service records yet"
                description="Scan a unit's QR code to record your first service."
                action={
                  <Link to="/scan">
                    <Button size="sm">Scan QR</Button>
                  </Link>
                }
              />
            )}
          </Card>
        ) : (
          <div className="space-y-4">
            {monthGroups.map((group) => (
              <section key={group.key} aria-labelledby={`month-${group.key}`}>
                {/* Sticks below the app header (h-16 plus its border) */}
                <h2
                  id={`month-${group.key}`}
                  className="sticky top-[65px] z-10 -mx-4 px-4 sm:mx-0 sm:px-0 py-2 bg-primary-50 text-xs font-semibold uppercase tracking-wide text-primary-500"
                >
                  {group.label}
                  <span className="font-normal normal-case tracking-normal text-primary-400">
                    {" "}
                    · {group.records.length} record
                    {group.records.length === 1 ? "" : "s"}
                  </span>
                </h2>
                <Card padding="none" className="overflow-hidden">
                  <ul className="divide-y divide-primary-100">
                    {group.records.map((record) => (
                      <li key={record.id}>
                        <ServiceRecordRow record={record} />
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

interface MonthGroup {
  key: string;
  label: string;
  records: TechnicianServiceRecord[];
}

/** Newest first, split into calendar months. */
function groupByMonth(records: TechnicianServiceRecord[]): MonthGroup[] {
  const sorted = [...records].sort(
    (a, b) =>
      new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime(),
  );
  const groups: MonthGroup[] = [];
  for (const record of sorted) {
    const date = new Date(record.serviceDate);
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    const current = groups[groups.length - 1];
    if (current?.key === key) {
      current.records.push(record);
    } else {
      groups.push({
        key,
        label: date.toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        }),
        records: [record],
      });
    }
  }
  return groups;
}

function ServiceRecordRow({ record }: { record: TechnicianServiceRecord }) {
  const { asset } = record;
  const state = serviceRecordState(record);
  const isVoided = state === "VOIDED";
  const date = new Date(record.serviceDate);

  return (
    <Link
      to={`/service-records/${record.id}`}
      className={`group flex items-center gap-3 sm:gap-4 px-4 py-3 bg-white hover:bg-primary-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-500 ${
        isVoided ? "opacity-75" : ""
      }`}
    >
      {/* The month is in the section heading, so only day and weekday here */}
      <time
        dateTime={record.serviceDate}
        className="w-10 shrink-0 self-start text-center pt-0.5"
      >
        <span className="block text-lg font-semibold text-primary-800 leading-tight">
          {date.toLocaleDateString(undefined, { day: "2-digit" })}
        </span>
        <span className="block text-xs text-primary-400">
          {date.toLocaleDateString(undefined, { weekday: "short" })}
        </span>
      </time>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap justify-between items-start gap-x-2 gap-y-1">
          <p
            className={`font-semibold text-primary-900 group-hover:text-accent-600 transition-colors break-words ${
              isVoided ? "line-through" : ""
            }`}
          >
            {record.serviceType}
          </p>
          <Badge
            variant={serviceRecordStateBadgeVariant(state)}
            className="shrink-0"
          >
            {serviceRecordStateLabel(state)}
          </Badge>
        </div>
        <p className="text-sm text-primary-700 mt-0.5 break-words">
          {asset.brand} {asset.model}
          {asset.serialNumber && (
            <span className="text-primary-500"> · {asset.serialNumber}</span>
          )}
        </p>
        {(asset.location || record.photoCount > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-primary-500">
            {asset.location && (
              <span className="inline-flex items-center gap-1 min-w-0">
                <PiMapPinBold
                  className="w-3.5 h-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{asset.location}</span>
              </span>
            )}
            {record.photoCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <PiImageBold className="w-3.5 h-3.5" aria-hidden="true" />
                {record.photoCount} photo{record.photoCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}
      </div>

      <PiCaretRightBold
        className="w-4 h-4 shrink-0 text-primary-300 group-hover:text-accent-600 transition-colors"
        aria-hidden="true"
      />
    </Link>
  );
}
