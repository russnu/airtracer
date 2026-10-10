import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { assetsApi } from '../../lib/api-client';
import { Button, Card, Badge, EmptyState, Spinner, PageHeader, Alert } from '../../components/ui';
import type { Asset } from '../../types/api';

export function EquipmentListPage() {
  const { data: assets, isLoading, error } = useQuery<Asset[]>({
    queryKey: ['assets'],
    queryFn: assetsApi.getAll,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert variant="error" title="Error loading equipment">
          Failed to load equipment list. Please try again.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader 
        title="My Equipment" 
        action={
          <Link to="/equipment/new">
            <Button>Register Equipment</Button>
          </Link>
        }
      />

      {!assets?.length ? (
        <EmptyState
          title="No equipment registered yet"
          description="Start managing your air conditioning units by registering your first equipment."
          action={
            <Link to="/equipment/new">
              <Button>Register Equipment</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <Link key={asset.id} to={`/equipment/${asset.id}`} className="block group">
              <Card className="h-full hover:border-blue-500 transition-colors cursor-pointer flex flex-col">
                <div className="p-4 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                      {asset.brand} {asset.model}
                    </h3>
                    <Badge variant={asset.isActive ? 'success' : 'neutral'}>
                      {asset.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 text-sm text-slate-600">
                    {asset.equipmentType && (
                      <div>
                        <Badge variant="info">{asset.equipmentType.name || 'Equipment'}</Badge>
                      </div>
                    )}
                    {asset.serialNumber && (
                      <p><span className="font-medium">S/N:</span> {asset.serialNumber}</p>
                    )}
                    {asset.location && (
                      <p><span className="font-medium">Location:</span> {asset.location}</p>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-sm">
                  <span className={asset.qrCode ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {asset.qrCode ? '✓ QR Ready' : 'No QR Code'}
                  </span>
                  <span className="text-blue-600 font-medium group-hover:underline">View Details →</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
