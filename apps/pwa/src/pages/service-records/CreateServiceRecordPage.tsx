import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { serviceRecordsApi, ApiClientError } from '../../lib/api-client';
import type { CreateServiceRecordPayload } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { PageHeader } from '../../components/ui/PageHeader';

export function CreateServiceRecordPage() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
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
  });

  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: CreateServiceRecordPayload) => serviceRecordsApi.create(assetId!, data),
    onSuccess: () => {
      // Navigate back to where we came from, or an asset detail page
      navigate(-1);
    },
    onError: (err: Error) => {
      setError(err instanceof ApiClientError ? err.message : 'Failed to create service record.');
    }
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Convert string numbers to actual numbers where appropriate
    const payload: CreateServiceRecordPayload = {
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

    mutation.mutate(payload);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
          description="Log a new service or maintenance activity" 
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
          <Button type="button" variant="outline" onClick={() => navigate(-1)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending} isLoading={mutation.isPending}>
            Save Record
          </Button>
        </div>
      </form>
    </div>
  );
}
