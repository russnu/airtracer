import { useState } from "react";
import type { FormEvent } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { ApiClientError, isNetworkError } from "../../lib/api-client";
import { resolvePostLoginPath } from "../../lib/navigation";
import { useDeviceOutboxCounts } from "../../hooks/useOutbox";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Alert } from "../../components/ui/Alert";

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login, user } = useAuth();
  const location = useLocation();
  // Signed out, so every unsynced record belongs to another session; only the
  // count is shown.
  const { data: deviceCounts } = useDeviceOutboxCounts();
  const unsyncedOnDevice = deviceCounts
    ? deviceCounts.own + deviceCounts.otherAccounts
    : 0;

  // Signing in re-renders this page with a user, which navigates away: back
  // to the page the user was sent from (e.g. a passport) if this account may
  // open it, otherwise home.
  if (user) {
    return <Navigate to={resolvePostLoginPath(location.state, user)} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email, password });
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else if (isNetworkError(err)) {
        setError(
          "You appear to be offline. Connect to the internet to sign in.",
        );
      } else {
        setError("An unexpected error occurred during login.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-primary-50 flex flex-col justify-center px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <img
            src="/logo.svg"
            alt="AirTracer Logo"
            className="h-14 sm:h-16 w-auto"
          />
        </div>
        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold text-brand-tertiary">
          Sign in to{" "}
          <span>
            <span className="text-brand-primary">Air</span>
            <span className="text-brand-secondary">Tracer</span>
          </span>
        </h2>
        <p className="mt-2 text-center text-sm text-primary-600">
          Or{" "}
          <Link
            to="/register"
            state={location.state}
            className="font-medium text-accent-600 hover:text-accent-700"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 mx-auto w-full max-w-md">
        <div className="bg-white rounded-2xl border border-primary-200 shadow-card px-5 py-7 sm:px-10 sm:py-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {unsyncedOnDevice > 0 && (
              <Alert variant="info" title="Records waiting to sync">
                {unsyncedOnDevice} service record
                {unsyncedOnDevice === 1 ? " is" : "s are"} saved on this device.
                Sign in with the account that created{" "}
                {unsyncedOnDevice === 1 ? "it" : "them"} to upload{" "}
                {unsyncedOnDevice === 1 ? "it" : "them"}.
              </Alert>
            )}
            {error && (
              <Alert variant="error" title="Login Failed">
                {error}
              </Alert>
            )}

            <Input
              id="email"
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isSubmitting}
            />

            <Input
              id="password"
              type="password"
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
