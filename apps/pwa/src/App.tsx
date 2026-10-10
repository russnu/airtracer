import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardRouter } from './pages/dashboard/DashboardRouter';
import { EquipmentListPage } from './pages/equipment/EquipmentListPage';
import { EquipmentDetailPage } from './pages/equipment/EquipmentDetailPage';
import { EquipmentFormPage } from './pages/equipment/EquipmentFormPage';
import { PassportPage } from './pages/passport/PassportPage';
import { ScannerPage } from './pages/scanner/ScannerPage';
import { CreateServiceRecordPage } from './pages/service-records/CreateServiceRecordPage';
import { ServiceRecordDetailPage } from './pages/service-records/ServiceRecordDetailPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/qr/:token" element={<PassportPage />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardRouter />} />
                <Route path="/scan" element={<ScannerPage />} />

                {/* Equipment routes (OWNER) */}
                <Route path="/equipment" element={<EquipmentListPage />} />
                <Route path="/equipment/new" element={<EquipmentFormPage />} />
                <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
                <Route path="/equipment/:id/edit" element={<EquipmentFormPage />} />

                {/* Service record routes */}
                <Route
                  path="/equipment/:assetId/service-records/new"
                  element={<CreateServiceRecordPage />}
                />
                <Route
                  path="/service-records/:id"
                  element={<ServiceRecordDetailPage />}
                />
              </Route>
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
