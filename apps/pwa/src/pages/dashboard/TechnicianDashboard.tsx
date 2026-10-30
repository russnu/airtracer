import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { SavedPassportsList } from '../../components/offline/SavedPassportsList';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/buttonClasses';

export function TechnicianDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tokenInput, setTokenInput] = useState('');

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    // Support full URLs as well
    const match = token.match(/qr\/(ATR_[a-zA-Z0-9_-]+)/);
    const resolvedToken = match ? match[1] : token.includes('/') ? token.split('/').pop() : token;

    if (resolvedToken) {
      navigate(`/qr/${resolvedToken}`);
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto mt-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-brand-tertiary">Welcome, {user?.firstName}!</h1>
        <p className="mt-2 text-sm text-primary-500">Ready to service equipment?</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <h3 className="text-lg leading-6 font-medium text-brand-tertiary mb-4">Scan Equipment QR Code</h3>
          <p className="text-sm text-primary-500 mb-6">
            Scan the AirTracer QR code on the unit to view its digital passport and record maintenance activities.
          </p>
          <Link
            to="/scan"
            className={buttonClasses('primary', 'lg', 'w-full')}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Open Scanner
          </Link>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-primary-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-primary-500">Or enter manually</span>
              </div>
            </div>
            
            <form onSubmit={handleManualSubmit} className="mt-6 flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. ATR_xxxx or scan link"
                className="shadow-sm focus:ring-accent-500 focus:border-accent-500 block w-full sm:text-sm border-primary-300 rounded-md py-2 px-3 border"
              />
              <Button type="submit" variant="secondary" disabled={!tokenInput.trim()}>
                Go
              </Button>
            </form>
          </div>
        </div>
      </div>

      <SavedPassportsList />
    </div>
  );
}
