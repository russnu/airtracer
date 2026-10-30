import { useAuth } from "../../contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { assetsApi } from "../../lib/api-client";
import { Link } from "react-router-dom";
import { SavedPassportsList } from "../../components/offline/SavedPassportsList";
import { Badge } from "../../components/ui/Badge";
import { buttonClasses } from "../../components/ui/buttonClasses";
import { Spinner } from "../../components/ui/Spinner";

export function OwnerDashboard() {
  const { user } = useAuth();

  const {
    data: assets,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["assets"],
    queryFn: () => assetsApi.findAll(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-tertiary">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Here's an overview of your equipment.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-primary-500 truncate">
              Total Equipment
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-primary-900">
              {assets ? assets.length : "-"}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-primary-500 truncate">
              Active Equipment
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-primary-900">
              {assets ? assets.filter((a) => a.isActive).length : "-"}
            </dd>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <dt className="text-sm font-medium text-primary-500 truncate">
              Recent Services
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-primary-900">-</dd>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Link
          to="/equipment/new"
          className={buttonClasses("primary")}
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          Register Equipment
        </Link>
        <Link
          to="/scan"
          className={buttonClasses("secondary")}
        >
          <svg
            className="h-5 w-5 text-primary-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          Scan QR
        </Link>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 border-b border-primary-200 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-brand-tertiary">
            Recent Equipment
          </h3>
        </div>

        {isLoading && (
          <div className="p-8 flex justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <div className="p-8 text-center text-error-600">
            Failed to load equipment. Please try again.
          </div>
        )}

        {!isLoading && !error && assets?.length === 0 && (
          <div className="p-8 text-center text-primary-500">
            No equipment registered yet.
          </div>
        )}

        {!isLoading && !error && assets && assets.length > 0 && (
          <ul className="divide-y divide-primary-200">
            {assets.slice(0, 5).map((asset) => (
              <li key={asset.id}>
                <Link
                  to={`/equipment/${asset.id}`}
                  className="block hover:bg-primary-50"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-accent-600 truncate">
                        {asset.brand} {asset.model}
                      </p>
                      <Badge
                        variant={asset.isActive ? "success" : "neutral"}
                        className="ml-2 shrink-0"
                      >
                        {asset.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-primary-500">
                          <svg
                            className="shrink-0 mr-1.5 h-5 w-5 text-primary-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
                            />
                          </svg>
                          SN: {asset.serialNumber || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <SavedPassportsList />
    </div>
  );
}
