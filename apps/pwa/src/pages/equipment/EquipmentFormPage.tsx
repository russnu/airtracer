import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetsApi, ApiClientError } from '../../lib/api-client';
import { Button, Input, Card, PageHeader, Alert, Spinner } from '../../components/ui';
import type { CreateAssetPayload, Asset } from '../../types/api';

export function EquipmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Partial<CreateAssetPayload>>({
    brand: '',
    model: '',
    serialNumber: '',
    equipmentTypeId: '',
    refrigerant: '',
    capacity: undefined,
    capacityUnit: '',
    installationDate: '',
    location: '',
  });

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: asset, isLoading: isLoadingAsset } = useQuery<Asset>({
    queryKey: ['assets', id],
    queryFn: () => assetsApi.getById(id!),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (isEditMode && asset) {
      setFormData({
        brand: asset.brand,
        model: asset.model,
        serialNumber: asset.serialNumber || '',
        equipmentTypeId: asset.equipmentTypeId || '',
        refrigerant: asset.refrigerant || '',
        capacity: asset.capacity || undefined,
        capacityUnit: asset.capacityUnit || '',
        installationDate: asset.installationDate ? new Date(asset.installationDate).toISOString().split('T')[0] : '',
        location: asset.location || '',
      });
    }
  }, [asset, isEditMode]);

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
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateAssetPayload>) => assetsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
      navigate(`/equipment/${id}`);
    },
    onError: (err) => {
      if (err instanceof ApiClientError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.brand || !formData.model || !formData.equipmentTypeId) {
      setErrorMsg('Brand, model, and equipment type are required.');
      return;
    }

    const payload = {
      ...formData,
      capacity: formData.capacity ? Number(formData.capacity) : undefined,
    } as CreateAssetPayload;

    if (isEditMode) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isEditMode && isLoadingAsset) {
    return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto p-4 max-w-3xl space-y-6">
      <div className="mb-4">
        <Link to={isEditMode ? `/equipment/${id}` : "/equipment"} className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
          &larr; Back
        </Link>
      </div>

      <PageHeader title={isEditMode ? 'Edit Equipment' : 'Register New Equipment'} />

      {errorMsg && (
        <Alert variant="error" title="Error">
          {errorMsg}
        </Alert>
      )}

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Brand *</label>
              <Input
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="e.g. Daikin"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Model *</label>
              <Input
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g. FTKQ25"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Serial Number</label>
              <Input
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Optional"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Equipment Type ID *</label>
              <Input
                name="equipmentTypeId"
                value={formData.equipmentTypeId}
                onChange={handleChange}
                placeholder="Enter valid Type ID"
                required
              />
              <p className="text-xs text-slate-500">For now, enter the UUID of the equipment type.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Capacity</label>
              <Input
                type="number"
                step="0.1"
                name="capacity"
                value={formData.capacity || ''}
                onChange={handleChange}
                placeholder="e.g. 1.5"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Capacity Unit</label>
              <select
                name="capacityUnit"
                value={formData.capacityUnit}
                onChange={handleChange}
                className="flex h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select Unit...</option>
                <option value="HP">HP</option>
                <option value="TR">TR</option>
                <option value="BTU">BTU</option>
                <option value="kW">kW</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Refrigerant</label>
              <Input
                name="refrigerant"
                value={formData.refrigerant}
                onChange={handleChange}
                placeholder="e.g. R32"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">Installation Date</label>
              <Input
                type="date"
                name="installationDate"
                value={formData.installationDate}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="block text-sm font-medium text-slate-700">Location</label>
              <Input
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Living Room, Building A Roof"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t border-slate-100">
            <Link to={isEditMode ? `/equipment/${id}` : "/equipment"}>
              <Button type="button" variant="outline">Cancel</Button>
            </Link>
            <Button type="submit" isLoading={isPending}>
              {isEditMode ? 'Save Changes' : 'Register Equipment'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
