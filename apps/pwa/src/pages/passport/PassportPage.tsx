import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PublicServiceRecord } from "../../types/api";
import { useAuth } from "../../contexts/AuthContext";
import { useOutbox } from "../../hooks/useOutbox";
import {
  loadPassport,
  PassportUnavailableError,
  removeSavedPassport,
  savePassport,
} from "../../lib/offline/passports";
import type { PassportView } from "../../lib/offline/passports";
import {
  isQuotaExceededError,
  requestPersistentStorage,
} from "../../lib/offline/db";
import { OfflineBanner } from "../../components/OfflineBanner";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { buttonClasses } from "../../components/ui/buttonClasses";
import { Spinner } from "../../components/ui/Spinner";
import { Alert } from "../../components/ui/Alert";
import {
  PiBarcodeBold,
  PiBuildingApartmentBold,
  PiCaretDownBold,
  PiGaugeBold,
  PiSquaresFourBold,
  PiTagBold,
  PiUserGear,
} from "react-icons/pi";
import { DataIcon } from "../../components/ui/DataIcon";
import { ServiceTimeline } from "../../components/service-records/ServiceTimeline";

export function PassportPage() {
  const { token } = useParams<{ token: string }>();
  const { user, isLoading: isAuthLoading } = useAuth();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const queryKey = ["passport", token, userId];
  const [saveError, setSaveError] = useState<string | null>(null);
  const { items: outboxItems } = useOutbox();

  const { data: view, isLoading, error } = useQuery<PassportView, Error>({
    queryKey,
    queryFn: () => loadPassport(token!, userId),
    // Wait for the session so the saved-copy fallback knows the user.
    enabled: !!token && !isAuthLoading,
    // The query function falls back to the saved copy itself, so it must run
    // even when the browser reports no connection.
    networkMode: "always",
    retry: (failureCount, err) =>
      !(err instanceof PassportUnavailableError) && failureCount < 1,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!view || !userId || !token) {
        throw new Error("Sign in to save passports for offline use.");
      }
      const saved = await savePassport(token, view.data, userId);
      await requestPersistentStorage();
      return saved;
    },
    onSuccess: (saved) => {
      setSaveError(null);
      queryClient.setQueryData<PassportView>(queryKey, (current) =>
        current ? { ...current, saved } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["saved-passports"] });
    },
    onError: (err: Error) => {
      setSaveError(
        isQuotaExceededError(err)
          ? "This device is out of storage space. Remove other saved passports and try again."
          : "Could not save this passport on this device.",
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: (assetId: string) => removeSavedPassport(assetId),
    onSuccess: () => {
      setSaveError(null);
      queryClient.setQueryData<PassportView>(queryKey, (current) =>
        current ? { ...current, saved: null } : current,
      );
      queryClient.invalidateQueries({ queryKey: ["saved-passports"] });
    },
    onError: () => {
      setSaveError("Could not remove the offline copy.");
    },
  });

  if (isLoading || isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-primary-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !view) {
    const unavailable = error instanceof PassportUnavailableError;
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Alert
          variant="error"
          title={unavailable ? "Passport Not Available" : "Error"}
          className="mt-8"
        >
          {unavailable
            ? "The QR code you scanned is either invalid, inactive, or not found in our system."
            : error?.message || "Failed to load equipment passport."}
          {unavailable && error.removedOfflineCopy && (
            <> The offline copy saved on this device has been removed.</>
          )}
        </Alert>
      </div>
    );
  }

  const { asset, serviceHistory } = view.data;
  const { saved } = view;
  const pendingForAsset = outboxItems.filter(
    (item) => item.assetId === asset.id && item.status !== "synced",
  );
  const isSavedCopy = view.source === "saved";

  return (
    <div className="min-h-screen bg-primary-50 pb-12">
      <OfflineBanner />
      {/* Header */}
      <header className="bg-primary-900 text-white py-6 px-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight text-accent-400">
              AirTracer
            </span>
            <span className="text-sm font-medium text-primary-300 bg-primary-800 px-2 py-1 rounded">
              Digital Passport
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {isSavedCopy && saved && (
          <Alert variant="warning" title="Offline copy">
            Saved {new Date(saved.savedAt).toLocaleString()}, last updated{" "}
            {new Date(saved.refreshedAt).toLocaleString()}. It may be out of
            date, and photos are only available online.
          </Alert>
        )}

        {/* Offline save */}
        {userId && (
          <section>
            {saveError && (
              <Alert
                variant="error"
                className="mb-3"
                onDismiss={() => setSaveError(null)}
              >
                {saveError}
              </Alert>
            )}
            <Card
              padding="sm"
              className="flex flex-col sm:flex-row items-center justify-between gap-3"
            >
              <p className="text-sm text-primary-600 text-center sm:text-left">
                {saved
                  ? "Saved on this device for offline viewing (text only)."
                  : "Save this passport to view it without a connection."}
              </p>
              {saved ? (
                <Button
                  variant="outline"
                  size="sm"
                  isLoading={removeMutation.isPending}
                  onClick={() => removeMutation.mutate(saved.assetId)}
                >
                  Remove offline copy
                </Button>
              ) : (
                <Button
                  size="sm"
                  isLoading={saveMutation.isPending}
                  onClick={() => saveMutation.mutate()}
                >
                  Save for offline
                </Button>
              )}
            </Card>
          </section>
        )}

        {/* Equipment Info */}
        <section>
          <h2 className="text-lg font-semibold text-brand-tertiary mb-4">
            Equipment Details
          </h2>
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-2 border-b border-primary-200 pb-2 w-full">
                <span>
                  <DataIcon icon={PiTagBold} />
                </span>
                <div>
                  <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">
                    Brand / Model
                  </p>
                  <p className="font-semibold text-primary-900">
                    {asset.brand} {asset.model && `/ ${asset.model}`}
                  </p>
                </div>
              </div>
              {asset.serialNumber && (
                <div className="flex items-center gap-2 border-b border-primary-200 pb-2 w-full">
                  <span>
                    <DataIcon icon={PiBarcodeBold} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">
                      Serial Number
                    </p>
                    <p className="font-semibold text-primary-900">
                      {asset.serialNumber}
                    </p>
                  </div>
                </div>
              )}
              {asset.equipmentType && (
                <div className="flex items-center gap-2 border-b border-primary-200 pb-2 w-full">
                  <span>
                    <DataIcon icon={PiSquaresFourBold} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">
                      Equipment Type
                    </p>
                    <p className="font-semibold text-primary-900">
                      {asset.equipmentType}
                    </p>
                  </div>
                </div>
              )}
              {asset.location && (
                <div className="flex items-center gap-2 border-b border-primary-200 pb-2 w-full">
                  <span>
                    <DataIcon icon={PiBuildingApartmentBold} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">
                      Location
                    </p>
                    <p className="font-semibold text-primary-900">
                      {asset.location}
                    </p>
                  </div>
                </div>
              )}
              {asset.installationDate && (
                <div className="flex items-center gap-2 pb-2 w-full">
                  <span>
                    <DataIcon icon={PiGaugeBold} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-primary-500 uppercase tracking-wider">
                      Installation Date
                    </p>
                    <p className="font-semibold text-primary-900">
                      {new Date(asset.installationDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Technician CTA */}
        <section>
          <Card className="p-4 bg-accent-50 border-accent-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-accent-700 text-center sm:text-left">
              Are you an authorized technician servicing this unit? Log in to
              record maintenance.
            </p>
            <Link
              to={`/equipment/${asset.id}/service-records/new`}
              className={buttonClasses("primary", "md", "whitespace-nowrap")}
            >
              Add Service Record
            </Link>
          </Card>
        </section>

        {/* Records saved on this device but not uploaded yet */}
        {pendingForAsset.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-brand-tertiary mb-1">
              Pending sync on this device
            </h2>
            <p className="text-sm text-primary-500 mb-4">
              Not part of the service history until uploaded.{" "}
              <Link to="/sync" className="text-accent-700 underline">
                View pending sync
              </Link>
            </p>
            <ul className="space-y-2">
              {pendingForAsset.map((item) => (
                <li key={item.clientRequestId}>
                  <Card
                    padding="sm"
                    className="flex items-center justify-between gap-3 border-dashed"
                  >
                    <div>
                      <p className="font-medium text-primary-900">
                        {item.payload.serviceType}
                      </p>
                      <p className="text-sm text-primary-500">
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

        {/* Service History */}
        <section>
          <h2 className="text-lg font-semibold text-brand-tertiary mb-4">
            Service History
          </h2>

          <ServiceTimeline
            records={serviceHistory}
            emptyState={
              <Card className="p-8 text-center text-primary-500">
                No service records found for this equipment.
              </Card>
            }
            renderRecord={(record) => (
              <ServiceRecordItem
                record={record}
                offlinePhotoCount={view.photoCounts[record.id] ?? 0}
              />
            )}
          />
        </section>
      </main>
    </div>
  );
}

function ServiceRecordItem({
  record,
  offlinePhotoCount,
}: {
  record: PublicServiceRecord;
  /** Photos left out of a saved offline copy. */
  offlinePhotoCount: number;
}) {
  const m = record.measurements;
  const hasMeasurements =
    m &&
    (m.suctionPressure !== null ||
      m.dischargePressure !== null ||
      m.current !== null ||
      m.voltage !== null ||
      m.returnAirTemp !== null ||
      m.supplyAirTemp !== null);

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-primary-100 bg-white">
        <h3 className="text-base font-semibold text-brand-tertiary break-words">
          {record.serviceType}
        </h3>

        {record.description && (
          <p className="text-sm text-primary-700 mt-3 whitespace-pre-wrap">
            {record.description}
          </p>
        )}

        {record.technician?.name && (
          <div className="p-3 border border-primary-200 bg-primary-50 rounded-lg mt-4">
            <p className="text-xs text-primary-500 flex items-center">
              <span className="mr-2">
                <PiUserGear className="w-4 h-4" />
              </span>
              <span>
                Technician: <b>{record.technician.name}</b>
              </span>
            </p>
          </div>
        )}
      </div>

      <details className="group border-t border-primary-100 bg-primary-50">
        <summary className="cursor-pointer p-3 text-sm font-medium text-primary-600 hover:text-primary-900 flex items-center justify-between">
          <span>View Detailed Measurements & Findings</span>
          <span className="transition group-open:rotate-180">
            <PiCaretDownBold className="w-4 h-4" />
          </span>
        </summary>
        <div className="p-5 pt-2 text-sm text-primary-600 border-t border-primary-100 space-y-6">
          {/* Measurements */}
          {hasMeasurements && (
            <div>
              <h4 className="font-semibold text-primary-900 mb-3 text-xs uppercase tracking-wider">
                Diagnostic Measurements
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                {m.suctionPressure !== null && (
                  <div>
                    <span className="block text-xs text-primary-400">
                      Suction Pressure
                    </span>
                    <span className="font-medium text-primary-900">
                      {m.suctionPressure} PSI
                    </span>
                  </div>
                )}
                {m.dischargePressure !== null && (
                  <div>
                    <span className="block text-xs text-primary-400">
                      Discharge Pressure
                    </span>
                    <span className="font-medium text-primary-900">
                      {m.dischargePressure} PSI
                    </span>
                  </div>
                )}
                {m.current !== null && (
                  <div>
                    <span className="block text-xs text-primary-400">
                      Current
                    </span>
                    <span className="font-medium text-primary-900">
                      {m.current} A
                    </span>
                  </div>
                )}
                {m.voltage !== null && (
                  <div>
                    <span className="block text-xs text-primary-400">
                      Voltage
                    </span>
                    <span className="font-medium text-primary-900">
                      {m.voltage} V
                    </span>
                  </div>
                )}
                {m.returnAirTemp !== null && (
                  <div>
                    <span className="block text-xs text-primary-400">
                      Return Air Temp
                    </span>
                    <span className="font-medium text-primary-900">
                      {m.returnAirTemp} °C
                    </span>
                  </div>
                )}
                {m.supplyAirTemp !== null && (
                  <div>
                    <span className="block text-xs text-primary-400">
                      Supply Air Temp
                    </span>
                    <span className="font-medium text-primary-900">
                      {m.supplyAirTemp} °C
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Findings & Recommendations */}
          {(record.findings || record.recommendations) && (
            <div className="space-y-4">
              {record.findings && (
                <div>
                  <h4 className="font-semibold text-primary-900 mb-1 text-xs uppercase tracking-wider">
                    Findings
                  </h4>
                  <p className="whitespace-pre-wrap bg-white p-3 rounded border border-primary-200">
                    {record.findings}
                  </p>
                </div>
              )}
              {record.recommendations && (
                <div>
                  <h4 className="font-semibold text-primary-900 mb-1 text-xs uppercase tracking-wider">
                    Recommendations
                  </h4>
                  <p className="whitespace-pre-wrap bg-white p-3 rounded border border-primary-200">
                    {record.recommendations}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Photos */}
          {record.photos && record.photos.length > 0 && (
            <div>
              <h4 className="font-semibold text-primary-900 mb-3 text-xs uppercase tracking-wider">
                Photo Evidence
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {record.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden border border-primary-200 bg-white"
                  >
                    <img
                      src={photo.url}
                      alt="Service evidence"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {offlinePhotoCount > 0 && (
            <p className="text-xs text-primary-500">
              {offlinePhotoCount} photo{offlinePhotoCount === 1 ? "" : "s"} —
              available online.
            </p>
          )}
        </div>
      </details>
    </Card>
  );
}
