import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { qrApi } from '../../lib/api-client';
import type { PublicPassportResponse, PublicServiceRecord } from '../../types/api';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { ApiClientError } from '../../lib/api-client';

export function PassportPage() {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery<PublicPassportResponse, Error>({
    queryKey: ['passport', token],
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
    const isNotFound = error instanceof ApiClientError && error.status === 404;
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <Alert variant="error" title={isNotFound ? "Passport Not Found" : "Error"} className="mt-8">
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
            <span className="text-2xl font-bold tracking-tight text-emerald-400">AirTracer</span>
            <span className="text-sm font-medium text-slate-300 bg-slate-800 px-2 py-1 rounded">Passport</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Equipment Info */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Equipment Details</h2>
          <Card className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-slate-500">Brand / Model</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {asset.brand} {asset.model && `/ ${asset.model}`}
                </p>
              </div>
              {asset.serialNumber && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Serial Number</p>
                  <p className="mt-1 text-base font-medium text-slate-900">{asset.serialNumber}</p>
                </div>
              )}
              {asset.equipmentType && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Equipment Type</p>
                  <p className="mt-1 text-base font-medium text-slate-900">{asset.equipmentType}</p>
                </div>
              )}
              {asset.location && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Location</p>
                  <p className="mt-1 text-base font-medium text-slate-900">{asset.location}</p>
                </div>
              )}
              {asset.installationDate && (
                <div>
                  <p className="text-sm font-medium text-slate-500">Installation Date</p>
                  <p className="mt-1 text-base font-medium text-slate-900">
                    {new Date(asset.installationDate).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </section>

        {/* Technician CTA */}
        <section>
          <Card className="p-4 bg-emerald-50 border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-emerald-800 text-center sm:text-left">
              Are you a technician servicing this equipment? Log in to create a service record.
            </p>
            <Link 
              to={`/equipment/${asset.id}/service-records/new`}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 whitespace-nowrap transition-colors"
            >
              Add Service Record
            </Link>
          </Card>
        </section>

        {/* Service History */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Service History</h2>
          
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
  return (
    <Card className="overflow-hidden">
      <div className="p-5 border-b border-slate-100 bg-white">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{record.serviceType}</h3>
            <p className="text-sm text-slate-500 mt-1">
              {new Date(record.serviceDate).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="default" className="w-fit">{record.status}</Badge>
        </div>
        
        {record.description && (
          <p className="text-sm text-slate-700 mt-3 whitespace-pre-wrap">{record.description}</p>
        )}
        
        {record.technicianName && (
          <p className="text-xs text-slate-500 mt-3 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            Technician: {record.technicianName}
          </p>
        )}
      </div>

      <details className="group border-t border-slate-100 bg-slate-50">
        <summary className="cursor-pointer p-3 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center justify-between">
          <span>View Detailed Measurements & Findings</span>
          <span className="transition group-open:rotate-180">
            <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
          </span>
        </summary>
        <div className="p-5 pt-2 text-sm text-slate-600 border-t border-slate-100 space-y-6">
          
          {/* Measurements */}
          {(record.suctionPressure || record.dischargePressure || record.current || record.voltage || record.returnAirTemp || record.supplyAirTemp) && (
            <div>
              <h4 className="font-semibold text-slate-900 mb-3 text-xs uppercase tracking-wider">Measurements</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                {record.suctionPressure && <div><span className="block text-xs text-slate-400">Suction Pressure</span><span className="font-medium text-slate-900">{record.suctionPressure} PSI</span></div>}
                {record.dischargePressure && <div><span className="block text-xs text-slate-400">Discharge Pressure</span><span className="font-medium text-slate-900">{record.dischargePressure} PSI</span></div>}
                {record.current && <div><span className="block text-xs text-slate-400">Current</span><span className="font-medium text-slate-900">{record.current} A</span></div>}
                {record.voltage && <div><span className="block text-xs text-slate-400">Voltage</span><span className="font-medium text-slate-900">{record.voltage} V</span></div>}
                {record.returnAirTemp && <div><span className="block text-xs text-slate-400">Return Air Temp</span><span className="font-medium text-slate-900">{record.returnAirTemp} °C</span></div>}
                {record.supplyAirTemp && <div><span className="block text-xs text-slate-400">Supply Air Temp</span><span className="font-medium text-slate-900">{record.supplyAirTemp} °C</span></div>}
              </div>
            </div>
          )}

          {/* Findings & Recs */}
          {(record.findings || record.recommendations) && (
            <div className="space-y-4">
              {record.findings && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1 text-xs uppercase tracking-wider">Findings</h4>
                  <p className="whitespace-pre-wrap bg-white p-3 rounded border border-slate-200">{record.findings}</p>
                </div>
              )}
              {record.recommendations && (
                <div>
                  <h4 className="font-semibold text-slate-900 mb-1 text-xs uppercase tracking-wider">Recommendations</h4>
                  <p className="whitespace-pre-wrap bg-white p-3 rounded border border-slate-200">{record.recommendations}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}
