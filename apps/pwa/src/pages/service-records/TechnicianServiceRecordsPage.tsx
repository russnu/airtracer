import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PiImageBold, PiMapPinBold, PiQrCodeBold } from "react-icons/pi";
import { isNetworkError, serviceRecordsApi } from "../../lib/api-client";
import { useAuth } from "../../contexts/AuthContext";
import { useOutbox } from "../../hooks/useOutbox";
import type { ServiceStatus, TechnicianServiceRecord } from "../../types/api";
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
import { ServiceTimeline } from "../../components/service-records/ServiceTimeline";
import {
  SERVICE_STATUSES,
  serviceStatusBadgeVariant,
  serviceStatusLabel,
  serviceStatusStyles,
} from "../../components/service-records/serviceStatus";

type StatusFilter = ServiceStatus | "ALL";

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
      : searched.filter((record) => record.status === statusFilter);

  const countFor = (status: StatusFilter) =>
    status === "ALL"
      ? searched.length
      : searched.filter((record) => record.status === status).length;

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
            <h2 className="text-sm font-semibold text-slate-900">
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
                    <p className="font-medium text-slate-900">
                      {item.payload.serviceType}
                    </p>
                    <p className="text-sm text-slate-500">
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
          aria-label="Filter by status"
          className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {(["ALL", ...SERVICE_STATUSES] as StatusFilter[]).map((status) => {
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
                    className={`h-2.5 w-2.5 rounded-full ${serviceStatusStyles[status].node}`}
                    aria-hidden="true"
                  />
                )}
                {status === "ALL" ? "All" : serviceStatusLabel(status)}
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
        ) : (
          <Card padding="sm" className="sm:p-6">
            <ServiceTimeline
              records={visible}
              getStatus={(record) => record.status}
              emptyState={
                isFiltered ? (
                  <EmptyState
                    title="No matching records"
                    description="Try a different search or status."
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
                )
              }
              renderRecord={(record) => (
                <ServiceRecordCard record={record} />
              )}
            />
          </Card>
        )}
      </section>
    </div>
  );
}

function ServiceRecordCard({ record }: { record: TechnicianServiceRecord }) {
  const { asset } = record;
  return (
    <Link to={`/service-records/${record.id}`} className="block group">
      <div className="border border-primary-200 rounded-lg p-4 bg-white hover:border-accent-500 transition-colors">
        <div className="flex flex-wrap justify-between items-start gap-2">
          <p className="font-semibold text-slate-900 group-hover:text-accent-600 transition-colors break-words">
            {record.serviceType}
          </p>
          <Badge
            variant={serviceStatusBadgeVariant(record.status)}
            className="shrink-0"
          >
            {serviceStatusLabel(record.status)}
          </Badge>
        </div>
        <p className="text-sm font-medium text-slate-700 mt-1 break-words">
          {asset.brand} {asset.model}
          {asset.serialNumber && (
            <span className="font-normal text-slate-500">
              {" "}
              · {asset.serialNumber}
            </span>
          )}
        </p>
        {record.description && (
          <p className="text-sm text-slate-600 line-clamp-2 mt-2">
            {record.description}
          </p>
        )}
        {(asset.location || record.photoCount > 0) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
            {asset.location && (
              <span className="inline-flex items-center gap-1">
                <PiMapPinBold className="w-3.5 h-3.5" aria-hidden="true" />
                {asset.location}
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
    </Link>
  );
}
