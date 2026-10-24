import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { qrApi, ApiClientError } from "../../lib/api-client";
import type {
  PublicPassportResponse,
  PublicServiceRecord,
} from "../../types/api";
import { Card } from "../../components/ui/Card";
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

export function PassportPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<PublicPassportResponse, Error>({
    queryKey: ["passport", token],
    queryFn: () => qrApi.getPublicPassport(token!),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !data) {
    const isNotFound =
      error instanceof ApiClientError && error.statusCode === 404;
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Alert
          variant="error"
          title={isNotFound ? "Passport Not Found" : "Error"}
          className="mt-8"
        >
          {isNotFound
            ? "The QR code you scanned is either invalid, inactive, or not found in our system."
            : error?.message || "Failed to load equipment passport."}
        </Alert>
      </div>
    );
  }

  const { asset, serviceHistory } = data;

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Header */}
      <header className="bg-slate-900 text-white py-6 px-4 shadow-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold tracking-tight text-accent-400">
              AirTracer
            </span>
            <span className="text-sm font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded">
              Digital Passport
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Equipment Info */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Equipment Details
          </h2>
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 w-full">
                <span>
                  <DataIcon icon={PiTagBold} />
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Brand / Model
                  </p>
                  <p className="font-semibold text-slate-900">
                    {asset.brand} {asset.model && `/ ${asset.model}`}
                  </p>
                </div>
              </div>
              {asset.serialNumber && (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 w-full">
                  <span>
                    <DataIcon icon={PiBarcodeBold} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Serial Number
                    </p>
                    <p className="font-semibold text-slate-900">
                      {asset.serialNumber}
                    </p>
                  </div>
                </div>
              )}
              {asset.equipmentType && (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 w-full">
                  <span>
                    <DataIcon icon={PiSquaresFourBold} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Equipment Type
                    </p>
                    <p className="font-semibold text-slate-900">
                      {asset.equipmentType}
                    </p>
                  </div>
                </div>
              )}
              {asset.location && (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 w-full">
                  <span>
                    <DataIcon icon={PiBuildingApartmentBold} />
                  </span>
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Location
                    </p>
                    <p className="font-semibold text-slate-900">
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
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Installation Date
                    </p>
                    <p className="font-semibold text-slate-900">
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
              className="px-4 py-2 bg-accent-600 text-white text-sm font-medium rounded-lg hover:bg-accent-700 whitespace-nowrap transition-colors"
            >
              Add Service Record
            </Link>
          </Card>
        </section>

        {/* Service History */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Service History
          </h2>

          {serviceHistory.length === 0 ? (
            <Card className="p-8 text-center text-slate-500">
              No service records found for this equipment.
            </Card>
          ) : (
            <div className="space-y-4">
              {serviceHistory.map((record) => (
                <ServiceRecordItem key={record.id} record={record} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ServiceRecordItem({ record }: { record: PublicServiceRecord }) {
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
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-white">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              {record.serviceType}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              {new Date(record.serviceDate).toLocaleDateString()}
            </p>
          </div>
        </div>

        {record.description && (
          <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">
            {record.description}
          </p>
        )}

        {record.technician?.name && (
          <div className="p-3 border border-slate-200 bg-slate-50 rounded-lg mt-4">
            <p className="text-xs text-slate-500 flex items-center">
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

      <details className="group border-t border-slate-100 bg-slate-50">
        <summary className="cursor-pointer p-3 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center justify-between">
          <span>View Detailed Measurements & Findings</span>
          <span className="transition group-open:rotate-180">
            <PiCaretDownBold className="w-4 h-4" />
          </span>
        </summary>
        <div className="p-5 pt-2 text-sm text-slate-600 border-t border-slate-100 space-y-6">
          {/* Measurements */}
          {hasMeasurements && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">
                Diagnostic Measurements
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                {m.suctionPressure !== null && (
                  <div>
                    <span className="block text-xs text-slate-400">
                      Suction Pressure
                    </span>
                    <span className="font-medium text-slate-900">
                      {m.suctionPressure} PSI
                    </span>
                  </div>
                )}
                {m.dischargePressure !== null && (
                  <div>
                    <span className="block text-xs text-slate-400">
                      Discharge Pressure
                    </span>
                    <span className="font-medium text-slate-900">
                      {m.dischargePressure} PSI
                    </span>
                  </div>
                )}
                {m.current !== null && (
                  <div>
                    <span className="block text-xs text-slate-400">
                      Current
                    </span>
                    <span className="font-medium text-slate-900">
                      {m.current} A
                    </span>
                  </div>
                )}
                {m.voltage !== null && (
                  <div>
                    <span className="block text-xs text-slate-400">
                      Voltage
                    </span>
                    <span className="font-medium text-slate-900">
                      {m.voltage} V
                    </span>
                  </div>
                )}
                {m.returnAirTemp !== null && (
                  <div>
                    <span className="block text-xs text-slate-400">
                      Return Air Temp
                    </span>
                    <span className="font-medium text-slate-900">
                      {m.returnAirTemp} °C
                    </span>
                  </div>
                )}
                {m.supplyAirTemp !== null && (
                  <div>
                    <span className="block text-xs text-slate-400">
                      Supply Air Temp
                    </span>
                    <span className="font-medium text-slate-900">
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
                  <h4 className="font-semibold text-slate-900 mb-1 text-xs uppercase tracking-wider">
                    Findings
                  </h4>
                  <p className="whitespace-pre-wrap bg-white p-3 rounded border border-slate-200">
                    {record.findings}
                  </p>
                </div>
              )}
              {record.recommendations && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1 text-xs uppercase tracking-wider">
                    Recommendations
                  </h4>
                  <p className="whitespace-pre-wrap bg-white p-3 rounded border border-slate-200">
                    {record.recommendations}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Photos */}
          {record.photos && record.photos.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">
                Photo Evidence
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {record.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="aspect-square rounded-lg overflow-hidden border border-slate-200 bg-white"
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
        </div>
      </details>
    </Card>
  );
}
