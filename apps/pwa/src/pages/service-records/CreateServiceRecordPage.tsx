import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import {
  serviceRecordsApi,
  ApiClientError,
  isNetworkError,
} from '../../lib/api-client';
import type { Asset } from '../../types/api';
import { useAuth } from '../../contexts/AuthContext';
import { useSyncNow } from '../../hooks/useOutbox';
import {
  discardOutboxItem,
  enqueueServiceRecord,
  getOutboxItem,
} from '../../lib/offline/outbox';
import type { OutboxItem, OutboxPayload } from '../../lib/offline/outbox';
import {
  isQuotaExceededError,
  requestPersistentStorage,
} from '../../lib/offline/db';
import { getSavedPassportByAssetId } from '../../lib/offline/passports';
import type { PassportView } from '../../lib/offline/passports';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { PageHeader } from '../../components/ui/PageHeader';
import { Spinner } from '../../components/ui/Spinner';

// How long to wait for an online save before telling the user the record is
// saved on the device and will sync in the background.
const ONLINE_SAVE_WAIT_MS = 10_000;

interface FormState {
  serviceDate: string;
  serviceType: string;
  description: string;
  suctionPressure: string;
  dischargePressure: string;
  current: string;
  voltage: string;
  returnAirTemp: string;
  supplyAirTemp: string;
  findings: string;
  recommendations: string;
}

function emptyForm(): FormState {
  return {
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: 'Preventive Maintenance',
    description: '',
    suctionPressure: '',
    dischargePressure: '',
    current: '',
    voltage: '',
    returnAirTemp: '',
    supplyAirTemp: '',
    findings: '',
    recommendations: '',
  };
}

function formFromPayload(payload: OutboxPayload): FormState {
  const toText = (value: number | undefined) =>
    value === undefined ? '' : String(value);
  return {
    serviceDate: payload.serviceDate.split('T')[0],
    serviceType: payload.serviceType,
    description: payload.description ?? '',
    suctionPressure: toText(payload.suctionPressure),
    dischargePressure: toText(payload.dischargePressure),
    current: toText(payload.current),
    voltage: toText(payload.voltage),
    returnAirTemp: toText(payload.returnAirTemp),
    supplyAirTemp: toText(payload.supplyAirTemp),
    findings: payload.findings ?? '',
    recommendations: payload.recommendations ?? '',
  };
}

function payloadFromForm(formData: FormState): OutboxPayload {
  // Convert string numbers to actual numbers where appropriate
  return {
    serviceDate: new Date(formData.serviceDate).toISOString(),
    serviceType: formData.serviceType,
    description: formData.description || undefined,
    suctionPressure: formData.suctionPressure ? parseFloat(formData.suctionPressure) : undefined,
    dischargePressure: formData.dischargePressure ? parseFloat(formData.dischargePressure) : undefined,
    current: formData.current ? parseFloat(formData.current) : undefined,
    voltage: formData.voltage ? parseFloat(formData.voltage) : undefined,
    returnAirTemp: formData.returnAirTemp ? parseFloat(formData.returnAirTemp) : undefined,
    supplyAirTemp: formData.supplyAirTemp ? parseFloat(formData.supplyAirTemp) : undefined,
    findings: formData.findings || undefined,
    recommendations: formData.recommendations || undefined,
  };
}

/** Brand and model from data already on the device, if any. */
async function findAssetLabel(
  queryClient: QueryClient,
  assetId: string,
  userId: string | null,
): Promise<string | null> {
  const ownedAsset = queryClient.getQueryData<Asset>(['assets', assetId]);
  const passportAsset = queryClient
    .getQueriesData<PassportView>({ queryKey: ['passport'] })
    .map(([, view]) => view?.data.asset)
    .find((asset) => asset?.id === assetId);

  let asset = ownedAsset ?? passportAsset;
  if (!asset && userId) {
    try {
      asset = (await getSavedPassportByAssetId(assetId, userId))?.asset;
    } catch {
      // Offline storage unavailable; the label is optional.
    }
  }
  return asset ? `${asset.brand} ${asset.model}`.trim() : null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Loads the outbox item when the user is editing a rejected record
 * (`?retry=<clientRequestId>`), then renders the form.
 */
export function CreateServiceRecordPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const [searchParams] = useSearchParams();
  const retryId = searchParams.get('retry');

  const { data: retryItem, isLoading } = useQuery({
    queryKey: ['outbox', 'retry', retryId],
    queryFn: () => getOutboxItem(retryId!),
    enabled: !!retryId,
    networkMode: 'always',
    staleTime: Infinity,
  });

  if (!assetId) {
    return null;
  }

  if (retryId && isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const editable = retryItem && retryItem.assetId === assetId ? retryItem : null;
  return (
    <ServiceRecordForm
      key={editable?.clientRequestId ?? 'new'}
      assetId={assetId}
      retryItem={editable}
    />
  );
}

function ServiceRecordForm({
  assetId,
  retryItem,
}: {
  assetId: string;
  retryItem: OutboxItem | null;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const syncNow = useSyncNow();

  const [formData, setFormData] = useState<FormState>(() =>
    retryItem ? formFromPayload(retryItem.payload) : emptyForm(),
  );
  // One idempotency key per form. A retried record keeps its key, except
  // after a 409, which means the key itself was rejected.
  const [clientRequestId, setClientRequestId] = useState(() =>
    retryItem && retryItem.lastError?.statusCode !== 409
      ? retryItem.clientRequestId
      : crypto.randomUUID(),
  );
  const [replacesId, setReplacesId] = useState<string | null>(() =>
    retryItem && retryItem.lastError?.statusCode === 409
      ? retryItem.clientRequestId
      : null,
  );
  const [status, setStatus] = useState<'idle' | 'saving' | 'queued'>('idle');
  const [error, setError] = useState<string | null>(
    retryItem?.lastError?.message ?? null,
  );

  const { data: assetLabel = null } = useQuery({
    queryKey: ['asset-label', assetId, userId],
    queryFn: () => findAssetLabel(queryClient, assetId, userId),
    networkMode: 'always',
  });

  // Used only when this browser cannot store records on the device.
  const submitDirectly = async (payload: OutboxPayload) => {
    try {
      await serviceRecordsApi.create(assetId, {
        ...payload,
        clientRequestId,
        clientCapturedAt: new Date().toISOString(),
      });
      navigate(-1);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : isNetworkError(err)
            ? 'You appear to be offline, and this browser cannot save records on the device. Try again when connected.'
            : 'Failed to create service record.',
      );
      setStatus('idle');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError('Sign in to record a service.');
      return;
    }

    const payload = payloadFromForm(formData);
    setStatus('saving');

    // Save on the device first, so nothing is lost if the request fails.
    try {
      await enqueueServiceRecord({
        clientRequestId,
        userId,
        assetId,
        assetLabel,
        payload,
      });
    } catch (err) {
      if (isQuotaExceededError(err)) {
        setError(
          'This device is out of storage space, so the record could not be saved. Free up space and try again.',
        );
        setStatus('idle');
        return;
      }
      console.warn('AirTracer: could not save the record on this device.', err);
      await submitDirectly(payload);
      return;
    }

    if (replacesId) {
      await discardOutboxItem(replacesId).catch(() => undefined);
      setReplacesId(null);
    }
    void requestPersistentStorage();

    if (!navigator.onLine) {
      setStatus('queued');
      return;
    }

    await Promise.race([
      syncNow().catch((err) => {
        console.warn('AirTracer: sync after save failed.', err);
      }),
      delay(ONLINE_SAVE_WAIT_MS),
    ]);

    const item = await getOutboxItem(clientRequestId).catch(() => null);
    if (item?.status === 'synced') {
      navigate(-1);
      return;
    }
    if (item?.status === 'needs_attention') {
      // The server rejected it while the user is still here: keep the form
      // filled in so they can correct it, and drop the rejected copy.
      await discardOutboxItem(clientRequestId).catch(() => undefined);
      setClientRequestId(crypto.randomUUID());
      setError(item.lastError?.message ?? 'The server rejected this record.');
      setStatus('idle');
      return;
    }
    setStatus('queued');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (status === 'queued') {
    return (
      <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-20 space-y-4">
        <Alert variant="success" title="Saved on this device">
          This service record will be sent automatically when the connection
          returns. You can follow its progress on the Pending sync page.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate(-1)}>Done</Button>
          <Button variant="outline" onClick={() => navigate('/sync')}>
            View pending sync
          </Button>
        </div>
      </div>
    );
  }

  const isSaving = status === 'saving';

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 pb-20">
      <div className="mb-6 flex items-center space-x-4">
        <button 
          onClick={() => navigate(-1)}
          className="text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
          aria-label="Go back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <PageHeader 
          title="New Service Record" 
          description={
            assetLabel
              ? `Recording service for ${assetLabel}`
              : 'Log a new service or maintenance activity'
          }
          className="mb-0"
        />
      </div>

      {error && <Alert variant="error" title="Error" className="mb-6">{error}</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        {/* Section 1: Service Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-4">Service Information</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                name="serviceDate"
                value={formData.serviceDate}
                onChange={handleChange}
                required
              />
              <Select
                label="Service Type"
                name="serviceType"
                value={formData.serviceType}
                onChange={handleChange}
                required
                options={[
                  { label: 'Preventive Maintenance', value: 'Preventive Maintenance' },
                  { label: 'Corrective Maintenance', value: 'Corrective Maintenance' },
                  { label: 'Installation', value: 'Installation' },
                  { label: 'Inspection', value: 'Inspection' },
                  { label: 'Emergency Repair', value: 'Emergency Repair' },
                  { label: 'Cleaning', value: 'Cleaning' },
                  { label: 'Other', value: 'Other' },
                ]}
              />
            </div>
            <Textarea
              label="Description of Work"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Briefly describe the work performed..."
              rows={3}
            />
          </div>
        </Card>

        {/* Section 2: Measurements */}
        <Card className="p-6">
          <details className="group">
            <summary className="text-lg font-semibold text-slate-900 pb-3 mb-2 cursor-pointer list-none flex justify-between items-center border-b border-slate-100">
              <span>Diagnostic Measurements <span className="text-sm font-normal text-slate-500 ml-2">(Optional)</span></span>
              <span className="transition group-open:rotate-180">
                <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
              </span>
            </summary>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="Suction Pressure"
                name="suctionPressure"
                type="number"
                step="0.1"
                placeholder="PSI"
                value={formData.suctionPressure}
                onChange={handleChange}
              />
              <Input
                label="Discharge Pressure"
                name="dischargePressure"
                type="number"
                step="0.1"
                placeholder="PSI"
                value={formData.dischargePressure}
                onChange={handleChange}
              />
              <Input
                label="Current Draw"
                name="current"
                type="number"
                step="0.1"
                placeholder="Amperes (A)"
                value={formData.current}
                onChange={handleChange}
              />
              <Input
                label="Voltage"
                name="voltage"
                type="number"
                step="0.1"
                placeholder="Volts (V)"
                value={formData.voltage}
                onChange={handleChange}
              />
              <Input
                label="Return Air Temp"
                name="returnAirTemp"
                type="number"
                step="0.1"
                placeholder="°C"
                value={formData.returnAirTemp}
                onChange={handleChange}
              />
              <Input
                label="Supply Air Temp"
                name="supplyAirTemp"
                type="number"
                step="0.1"
                placeholder="°C"
                value={formData.supplyAirTemp}
                onChange={handleChange}
              />
            </div>
          </details>
        </Card>

        {/* Section 3: Findings & Recs */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 border-b border-slate-100 pb-3 mb-4">Findings & Recommendations</h2>
          <div className="space-y-4">
            <Textarea
              label="Findings"
              name="findings"
              value={formData.findings}
              onChange={handleChange}
              placeholder="Observations, issues found, condition of equipment..."
              rows={3}
            />
            <Textarea
              label="Recommendations"
              name="recommendations"
              value={formData.recommendations}
              onChange={handleChange}
              placeholder="Suggested future actions, repairs needed, parts to order..."
              rows={3}
            />
          </div>
        </Card>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving} isLoading={isSaving}>
            Save Record
          </Button>
        </div>
      </form>
    </div>
  );
}
