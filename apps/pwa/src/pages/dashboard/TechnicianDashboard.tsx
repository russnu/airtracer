import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { SavedPassportsList } from '../../components/offline/SavedPassportsList';

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
        <h1 className="text-2xl font-bold text-slate-900">Welcome, {user?.firstName}!</h1>
        <p className="mt-2 text-sm text-slate-500">Ready to service equipment?</p>
      </div>

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6 text-center">
          <h3 className="text-lg leading-6 font-medium text-slate-900 mb-4">Scan Equipment QR Code</h3>
          <p className="text-sm text-slate-500 mb-6">
            Scan the AirTracer QR code on the unit to view its digital passport and record maintenance activities.
          </p>
          <Link
            to="/scan"
            className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-accent-600 hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 w-full justify-center"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Open Scanner
          </Link>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Or enter manually</span>
              </div>
            </div>
            
            <form onSubmit={handleManualSubmit} className="mt-6 flex gap-2">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="e.g. ATR_xxxx or scan link"
                className="shadow-sm focus:ring-accent-500 focus:border-accent-500 block w-full sm:text-sm border-slate-300 rounded-md py-2 px-3 border"
              />
              <button
                type="submit"
                disabled={!tokenInput.trim()}
                className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      </div>

      <SavedPassportsList />
    </div>
  );
}
