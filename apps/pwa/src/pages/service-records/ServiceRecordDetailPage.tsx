import { useState } from "react";
import type { ChangeEvent } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  serviceRecordsApi,
  servicePhotosApi,
  ApiClientError,
} from "../../lib/api-client";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import { PageHeader } from "../../components/ui/PageHeader";
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import type { ServiceRecord, ServiceStatus } from "../../types/api";
import { PiArrowLeftBold } from "react-icons/pi";
import { useAuth } from "../../contexts/AuthContext";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import {
  NEXT_SERVICE_STATUSES,
  serviceStatusBadgeVariant,
  serviceStatusLabel,
} from "../../components/service-records/serviceStatus";

const STATUS_ACTIONS: Record<
  ServiceStatus,
  { label: string; variant: "primary" | "success" | "outline" }
> = {
  PENDING: { label: "Reopen", variant: "outline" },
  IN_PROGRESS: { label: "Start work", variant: "primary" },
  COMPLETED: { label: "Mark completed", variant: "success" },
  CANCELLED: { label: "Cancel record", variant: "outline" },
};

const MEASUREMENTS: {
  key: keyof Pick<
    ServiceRecord,
    | "suctionPressure"
    | "dischargePressure"
    | "current"
    | "voltage"
    | "returnAirTemp"
    | "supplyAirTemp"
  >;
  label: string;
  unit: string;
}[] = [
  { key: "suctionPressure", label: "Suction Pressure", unit: "PSI" },
  { key: "dischargePressure", label: "Discharge Pressure", unit: "PSI" },
  { key: "current", label: "Current", unit: "A" },
  { key: "voltage", label: "Voltage", unit: "V" },
  { key: "returnAirTemp", label: "Return Air Temp", unit: "°C" },
  { key: "supplyAirTemp", label: "Supply Air Temp", unit: "°C" },
];

export function ServiceRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isOnline = useOnlineStatus();

  const [statusError, setStatusError] = useState<string | null>(null);
  const [confirmStatus, setConfirmStatus] = useState<ServiceStatus | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    data: record,
    isLoading: isLoadingRecord,
    error: recordError,
  } = useQuery({
    queryKey: ["service-records", id],
    queryFn: () => serviceRecordsApi.findOne(id!),
    enabled: !!id,
  });

  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ["service-photos", id],
    queryFn: () => servicePhotosApi.findByServiceRecord(id!),
    enabled: !!id,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) =>
      servicePhotosApi.upload(id!, file, caption || undefined),
    onSuccess: () => {
      setSelectedFile(null);
      setCaption("");
      setUploadError(null);
      queryClient.invalidateQueries({ queryKey: ["service-photos", id] });
    },
    onError: (err) => {
      setUploadError(
        err instanceof ApiClientError ? err.message : "Failed to upload photo.",
      );
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: ServiceStatus) =>
      serviceRecordsApi.updateStatus(id!, { status }),
    onSuccess: (updated) => {
      setStatusError(null);
      setConfirmStatus(null);
      // The PATCH response has no asset, so keep the one already loaded.
      queryClient.setQueryData<ServiceRecord>(
        ["service-records", id],
        (current) => (current ? { ...current, status: updated.status } : current),
      );
      queryClient.invalidateQueries({ queryKey: ["service-records", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["assets"] });
    },
    onError: (err) => {
      setConfirmStatus(null);
      setStatusError(
        err instanceof ApiClientError
          ? err.message
          : "Failed to update the status.",
      );
    },
  });

  const handleStatusChange = (status: ServiceStatus) => {
    // COMPLETED and CANCELLED are final, so confirm them first.
    if (NEXT_SERVICE_STATUSES[status].length === 0) {
      setConfirmStatus(status);
    } else {
      statusMutation.mutate(status);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  if (isLoadingRecord) {
    return (
      <div className="p-8 flex justify-center h-[50vh] items-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (recordError || !record) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Alert variant="error" title="Error">
          Failed to load service record details.
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
          Go Back
        </Button>
      </div>
    );
  }

  // The API enforces these; they only decide which controls to show.
  const isRecordTechnician = !!user && user.id === record.technicianId;
  const canAddPhotos =
    isRecordTechnician || (!!user && user.id === record.asset?.ownerId);
  const nextStatuses = isRecordTechnician
    ? NEXT_SERVICE_STATUSES[record.status]
    : [];
  const recordedMeasurements = MEASUREMENTS.filter(
    ({ key }) => record[key] !== null,
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <div className="mb-6 flex items-start space-x-4">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
          aria-label="Go back"
        >
          <PiArrowLeftBold className="w-5 h-5" />
        </button>
        <PageHeader
          title="Service Record Details"
          description={`Logged on ${new Date(record.serviceDate).toLocaleDateString()}`}
        />
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 break-words">
                {record.serviceType}
              </h2>
              {record.asset && (
                <p className="text-sm font-medium text-slate-700 mt-1 break-words">
                  {record.asset.brand} {record.asset.model}
                  {record.asset.serialNumber && (
                    <span className="font-normal text-slate-500">
                      {" "}
                      · {record.asset.serialNumber}
                    </span>
                  )}
                </p>
              )}
              <p className="text-slate-500 text-xs mt-1">
                Record ID: {record.id}
              </p>
            </div>
            <Badge
              variant={serviceStatusBadgeVariant(record.status)}
              className="shrink-0"
            >
              {serviceStatusLabel(record.status)}
            </Badge>
          </div>

          {/* Status actions: only for the technician who created the record */}
          {isRecordTechnician && (
            <div className="mb-6">
              {statusError && (
                <Alert
                  variant="error"
                  className="mb-3"
                  onDismiss={() => setStatusError(null)}
                >
                  {statusError}
                </Alert>
              )}
              {nextStatuses.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  {nextStatuses.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={STATUS_ACTIONS[status].variant}
                      disabled={!isOnline || statusMutation.isPending}
                      isLoading={
                        statusMutation.isPending &&
                        statusMutation.variables === status
                      }
                      onClick={() => handleStatusChange(status)}
                    >
                      {STATUS_ACTIONS[status].label}
                    </Button>
                  ))}
                  {!isOnline && (
                    <span className="text-sm text-slate-500">
                      Status changes need a connection.
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  This record is {serviceStatusLabel(record.status).toLowerCase()}{" "}
                  and can no longer change status.
                </p>
              )}
            </div>
          )}

          {record.description && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">
                Description of Work
              </h3>
              <p className="text-sm text-slate-900 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">
                {record.description}
              </p>
            </div>
          )}

          {/* Measurements */}
          {recordedMeasurements.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-3">
                Diagnostic Measurements
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                {recordedMeasurements.map(({ key, label, unit }) => (
                  <div key={key}>
                    <span className="block text-xs text-slate-400">
                      {label}
                    </span>
                    <span className="font-medium text-slate-900">
                      {record[key]} {unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Findings & Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">
                Findings
              </h3>
              <div className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-100 h-full min-h-20">
                {record.findings ? (
                  <p className="text-slate-900 whitespace-pre-wrap">
                    {record.findings}
                  </p>
                ) : (
                  <p className="text-slate-400 italic text-sm">
                    No findings recorded.
                  </p>
                )}
              </div>
            </div>
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">
                Recommendations
              </h3>
              <div className="text-sm bg-slate-50 p-4 rounded-lg border border-slate-100 h-full min-h-20">
                {record.recommendations ? (
                  <p className="text-slate-900 whitespace-pre-wrap">
                    {record.recommendations}
                  </p>
                ) : (
                  <p className="text-slate-400 italic text-sm">
                    No recommendations recorded.
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Photos Evidence */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-4">
            Photo Evidence
          </h3>

          {uploadError && (
            <Alert variant="error" title="Upload Error" className="mb-4">
              {uploadError}
            </Alert>
          )}

          {/* Upload input: the asset owner or the record's technician */}
          {canAddPhotos && (
            <div className="mb-6 p-4 border border-dashed border-slate-300 rounded-lg bg-slate-50">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                Attach Photo
              </h4>
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-accent-50 file:text-accent-700 hover:file:bg-accent-100"
                />
                <input
                  type="text"
                  placeholder="Caption (optional)"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500"
                />
                <Button
                  size="sm"
                  disabled={!selectedFile || !isOnline || uploadMutation.isPending}
                  isLoading={uploadMutation.isPending}
                  onClick={handleUpload}
                >
                  Upload Photo
                </Button>
              </div>
              {!isOnline && (
                <p className="text-sm text-slate-500 mt-2">
                  Photo uploads need a connection.
                </p>
              )}
            </div>
          )}

          {isLoadingPhotos ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : photos.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-8 text-center">
              <p className="text-slate-500 italic">
                No photos attached to this record.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square"
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || "Service photo"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                  {photo.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                      {photo.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={confirmStatus !== null}
        title={
          confirmStatus === "COMPLETED"
            ? "Mark this record completed?"
            : "Cancel this record?"
        }
        tone={confirmStatus === "COMPLETED" ? "primary" : "danger"}
        confirmLabel={
          confirmStatus ? STATUS_ACTIONS[confirmStatus].label : "Confirm"
        }
        isConfirming={statusMutation.isPending}
        onConfirm={() => confirmStatus && statusMutation.mutate(confirmStatus)}
        onCancel={() => setConfirmStatus(null)}
      >
        <p>
          {confirmStatus === "COMPLETED" ? "Completed" : "Cancelled"} is a final
          status. The record cannot change status again afterwards.
        </p>
      </ConfirmDialog>
    </div>
  );
}
