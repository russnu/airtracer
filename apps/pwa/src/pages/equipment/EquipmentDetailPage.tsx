import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { assetsApi, qrApi } from '../../lib/api-client';
import { Button, Card, Badge, Spinner, PageHeader, Alert, EmptyState } from '../../components/ui';
import type { Asset, ServiceRecord } from '../../types/api';

export function EquipmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: asset, isLoading, error } = useQuery<Asset>({
    queryKey: ['assets', id],
    queryFn: () => assetsApi.findOne(id!),
    enabled: !!id,
  });

  const generateQrMutation = useMutation({
    mutationFn: () => qrApi.createForAsset(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
    },
  });

  const regenerateQrMutation = useMutation({
    mutationFn: () => qrApi.regenerate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: () => assetsApi.deactivate(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets', id] });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center p-8"><Spinner size="lg" /></div>;
  }

  if (error || !asset) {
    return (
      <div className="p-4">
        <Alert variant="error" title="Error">
          Failed to load equipment details.
        </Alert>
        <Link to="/equipment" className="mt-4 inline-block text-blue-600 hover:underline">
          &larr; Back to Equipment
        </Link>
      </div>
    );
  }

  const handleDeactivate = () => {
    if (window.confirm('Are you sure you want to deactivate this equipment? Deactivated equipment cannot receive new service records.')) {
      deactivateMutation.mutate();
    }
  };

  const qrUrl = asset.qrCode ? `${window.location.origin}/qr/${asset.qrCode.token}` : '';

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'PENDING': return 'info';
      case 'IN_PROGRESS': return 'warning';
      case 'COMPLETED': return 'success';
      case 'CANCELLED': return 'error';
      default: return 'neutral';
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <Link to="/equipment" className="text-slate-500 hover:text-slate-800 text-sm font-medium transition-colors">
          &larr; Back to Equipment
        </Link>
      </div>

      <PageHeader 
        title={`${asset.brand} ${asset.model}`}
        action={
          <div className="flex space-x-2">
            <Link to={`/equipment/${asset.id}/edit`}>
              <Button variant="outline">Edit</Button>
            </Link>
            {asset.isActive ? (
              <Button 
                variant="danger" 
                onClick={handleDeactivate}
                isLoading={deactivateMutation.isPending}
              >
                Deactivate
              </Button>
            ) : (
              <Badge variant="neutral">Deactivated</Badge>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">Equipment Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Status</p>
                <Badge variant={asset.isActive ? 'success' : 'neutral'}>
                  {asset.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-slate-500">Equipment Type</p>
                <p className="font-medium text-slate-900">{asset.equipmentType?.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Serial Number</p>
                <p className="font-medium text-slate-900">{asset.serialNumber || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Location</p>
                <p className="font-medium text-slate-900">{asset.location || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Capacity</p>
                <p className="font-medium text-slate-900">
                  {asset.capacity ? `${asset.capacity} ${asset.capacityUnit || ''}` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Refrigerant</p>
                <p className="font-medium text-slate-900">{asset.refrigerant || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Installation Date</p>
                <p className="font-medium text-slate-900">
                  {asset.installationDate ? new Date(asset.installationDate).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">Service History</h2>
            {!asset.serviceRecords || asset.serviceRecords.length === 0 ? (
              <EmptyState 
                title="No service records" 
                description="This equipment has not been serviced yet."
              />
            ) : (
              <div className="space-y-4">
                {asset.serviceRecords.map((record: ServiceRecord) => (
                  <Link key={record.id} to={`/service-records/${record.id}`} className="block group">
                    <div className="border border-slate-200 rounded-lg p-4 hover:border-blue-500 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {record.serviceType}
                          </p>
                          <p className="text-sm text-slate-500">
                            {new Date(record.serviceDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={getStatusBadgeVariant(record.status)}>
                          {record.status}
                        </Badge>
                      </div>
                      {record.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">{record.description}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-slate-900">QR Tag</h2>
            <div className="flex flex-col items-center text-center">
              {asset.qrCode ? (
                <>
                  <div className="bg-white p-4 border border-slate-200 rounded-xl mb-4">
                    <QRCodeSVG value={qrUrl} size={150} />
                  </div>
                  <p className="text-sm text-slate-600 mb-2">
                    Token: <span className="font-mono text-xs font-semibold">{asset.qrCode.token}</span>
                  </p>
                  <p className="text-sm text-slate-600 mb-4">
                    Scan this QR code to quickly access equipment details and service history.
                  </p>
                  <div className="w-full space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => window.open(qrUrl, '_blank')}
                    >
                      View Public Passport
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-xs"
                      isLoading={regenerateQrMutation.isPending}
                      onClick={() => {
                        if (window.confirm('Regenerating will invalidate the previous QR code. Continue?')) {
                          regenerateQrMutation.mutate();
                        }
                      }}
                    >
                      Regenerate QR Code
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-32 h-32 bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center mb-4">
                    <span className="text-slate-400">No QR Code</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Generate a QR code to easily track and access this equipment's information.
                  </p>
                  <Button 
                    onClick={() => generateQrMutation.mutate()}
                    isLoading={generateQrMutation.isPending}
                    className="w-full"
                  >
                    Generate QR Code
                  </Button>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
