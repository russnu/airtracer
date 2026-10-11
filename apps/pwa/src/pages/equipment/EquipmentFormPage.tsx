import { useState } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, ApiClientError } from '../../lib/api-client';
import { Button, Input, Card, PageHeader, Alert, Spinner } from '../../components/ui';
import type { CreateAssetPayload, Asset } from '../../types/api';

interface EquipmentFormFieldsProps {
  initialAsset?: Asset;
  isEditMode: boolean;
}

function EquipmentFormFields({ initialAsset, isEditMode }: EquipmentFormFieldsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<CreateAssetPayload>>(() => {
    if (initialAsset) {
      return {
        brand: initialAsset.brand,
        model: initialAsset.model,
        serialNumber: initialAsset.serialNumber || '',
        equipmentTypeId: initialAsset.equipmentTypeId || '',
        refrigerant: initialAsset.refrigerant || '',
        capacity: initialAsset.capacity || undefined,
        capacityUnit: initialAsset.capacityUnit || '',
        installationDate: initialAsset.installationDate
          ? new Date(initialAsset.installationDate).toISOString().split('T')[0]
          : '',
        location: initialAsset.location || '',
      };
    }
    return {
      brand: '',
      model: '',
      serialNumber: '',
      equipmentTypeId: '',
      refrigerant: '',
      capacity: undefined,
      capacityUnit: '',
      installationDate: '',
      location: '',
    };
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (data: CreateAssetPayload) => assetsApi.create(data),
    onSuccess: (newAsset) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      navigate(`/equipment/${newAsset.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateAssetPayload>) => assetsApi.update(initialAsset!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', initialAsset!.id] });
      navigate(`/equipment/${initialAsset!.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.brand || !formData.model || !formData.equipmentTypeId) {
      setErrorMsg('Brand, model, and equipment type are required.');
      return;
    }

    const payload = {
      ...formData,
      capacity: formData.capacity ? Number(formData.capacity) : undefined,
      installationDate: formData.installationDate ? new Date(formData.installationDate).toISOString() : undefined,
    } as CreateAssetPayload;

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      {errorMsg && (
        <Alert variant="error" title="Error">
          {errorMsg}
        </Alert>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              placeholder="e.g. Daikin, Mitsubishi, Panasonic"
              required
            />

            <Input
              label="Model"
              name="model"
              value={formData.model}
              onChange={handleChange}
              placeholder="e.g. FTKQ25, Inverter Split"
              required
            />

            <Input
              label="Serial Number"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              placeholder="e.g. SN-987654321"
            />

            <Input
              label="Equipment Type ID"
              name="equipmentTypeId"
              value={formData.equipmentTypeId}
              onChange={handleChange}
              placeholder="Equipment Type ID"
              hint="Enter the registered equipment type ID"
              required
            />

            <Input
              label="Capacity"
              type="number"
              step="0.1"
              name="capacity"
              value={formData.capacity ?? ''}
              onChange={handleChange}
              placeholder="e.g. 1.5, 2.0"
            />

            <div className="space-y-1">
              <label className="block text-sm font-medium text-primary-700">
                Capacity Unit
              </label>
              <select
                name="capacityUnit"
                value={formData.capacityUnit}
                onChange={handleChange}
                className="block w-full rounded-lg border border-primary-300 px-3 py-2 text-sm text-primary-900 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors bg-white hover:border-primary-400"
              >
                <option value="">Select Unit...</option>
                <option value="HP">HP (Horsepower)</option>
                <option value="TR">TR (Tons of Refrigeration)</option>
                <option value="BTU">BTU/hr</option>
                <option value="kW">kW</option>
              </select>
            </div>

            <Input
              label="Refrigerant"
              name="refrigerant"
              value={formData.refrigerant}
              onChange={handleChange}
              placeholder="e.g. R32, R410A, R22"
            />

            <Input
              label="Installation Date"
              type="date"
              name="installationDate"
              value={formData.installationDate}
              onChange={handleChange}
            />

            <div className="md:col-span-2">
              <Input
                label="Installation Location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Living Room, Building A 2nd Floor, Server Room"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100">
            <Link to={isEditMode ? `/equipment/${initialAsset?.id}` : '/equipment'}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isPending}>
              {isEditMode ? 'Save Changes' : 'Register Equipment'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}

export function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const { data: asset, isLoading, error } = useQuery<Asset>({
    queryKey: ['assets', id],
    queryFn: () => assetsApi.findOne(id!),
    enabled: isEditMode,
  });

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <div className="mb-4">
        <Link
          to={isEditMode ? `/equipment/${id}` : '/equipment'}
          className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors"
        >
          &larr; Back
        </Link>
      </div>

      <PageHeader title={isEditMode ? 'Edit Equipment' : 'Register New Equipment'} />

      {isEditMode && isLoading ? (
        <div className="flex justify-center p-8">
          <Spinner size="lg" />
        </div>
      ) : isEditMode && error ? (
        <Alert variant="error" title="Error">
          Failed to load equipment data.
        </Alert>
      ) : (
        <EquipmentFormFields
          key={asset?.id ?? 'new'}
          initialAsset={asset}
          isEditMode={isEditMode}
        />
      )}
    </div>
  );
}
