import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { serviceRecordsApi, servicePhotosApi } from '../../lib/api-client';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { Alert } from '../../components/ui/Alert';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';

export function ServiceRecordDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: record, isLoading: isLoadingRecord, error: recordError } = useQuery({
    queryKey: ['service-records', id],
    queryFn: () => serviceRecordsApi.findOne(id!),
    enabled: !!id,
  });

  const { data: photos = [], isLoading: isLoadingPhotos } = useQuery({
    queryKey: ['service-photos', id],
    queryFn: () => servicePhotosApi.findByServiceRecord(id!),
    enabled: !!id,
  });

  if (isLoadingRecord) {
    return <div className="p-8 flex justify-center h-[50vh] items-center"><Spinner size="lg" /></div>;
  }

  if (recordError || !record) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <Alert variant="error" title="Error">
          Failed to load service record details.
        </Alert>
        <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-20">
      <div className="mb-6 flex items-center space-x-4">
        <button 
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <PageHeader 
          title="Service Record Details" 
          description={`Logged on ${new Date(record.serviceDate).toLocaleDateString()}`}
          className="mb-0"
        />
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{record.serviceType}</h2>
              {record.technicianName && (
                <p className="text-slate-500 text-sm mt-1">Technician: {record.technicianName}</p>
              )}
            </div>
            <Badge variant="default" className="text-sm px-3 py-1">{record.status}</Badge>
          </div>

          {record.description && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h3>
              <p className="text-slate-900 whitespace-pre-wrap bg-slate-50 p-4 rounded-lg border border-slate-100">{record.description}</p>
            </div>
          )}

          {/* Measurements */}
          {(record.suctionPressure !== null || record.dischargePressure !== null || record.current !== null || record.voltage !== null || record.returnAirTemp !== null || record.supplyAirTemp !== null) && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Measurements</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <div><span className="block text-xs text-slate-400">Suction Pressure</span><span className="font-medium text-slate-900">{record.suctionPressure ?? '-'} PSI</span></div>
                <div><span className="block text-xs text-slate-400">Discharge Pressure</span><span className="font-medium text-slate-900">{record.dischargePressure ?? '-'} PSI</span></div>
                <div><span className="block text-xs text-slate-400">Current</span><span className="font-medium text-slate-900">{record.current ?? '-'} A</span></div>
                <div><span className="block text-xs text-slate-400">Voltage</span><span className="font-medium text-slate-900">{record.voltage ?? '-'} V</span></div>
                <div><span className="block text-xs text-slate-400">Return Air Temp</span><span className="font-medium text-slate-900">{record.returnAirTemp ?? '-'} °C</span></div>
                <div><span className="block text-xs text-slate-400">Supply Air Temp</span><span className="font-medium text-slate-900">{record.supplyAirTemp ?? '-'} °C</span></div>
              </div>
            </div>
          )}

          {/* Findings & Recs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Findings</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-full min-h-[100px]">
                {record.findings ? <p className="text-slate-900 whitespace-pre-wrap">{record.findings}</p> : <p className="text-slate-400 italic text-sm">No findings recorded.</p>}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Recommendations</h3>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 h-full min-h-[100px]">
                {record.recommendations ? <p className="text-slate-900 whitespace-pre-wrap">{record.recommendations}</p> : <p className="text-slate-400 italic text-sm">No recommendations recorded.</p>}
              </div>
            </div>
          </div>
        </Card>

        {/* Photos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-4">Photos</h3>
          {isLoadingPhotos ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : photos.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-8 text-center">
              <p className="text-slate-500 italic">No photos attached to this record.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {photos.map((photo) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square">
                  <img src={photo.url || '/placeholder-image.png'} alt={photo.caption || 'Service photo'} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
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
    </div>
  );
}
