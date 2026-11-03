import { useEffect, useState } from "react";
import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { AddRoleAction } from "../AddRoleAction";
import { InstallAppButton } from "../InstallAppButton";
import { OfflineBanner } from "../OfflineBanner";
import { SyncStatusIndicator } from "../offline/SyncStatusIndicator";
import { Button } from "../ui/Button";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useSyncNow } from "../../hooks/useOutbox";
import {
  countUnsynced,
  discardUnsyncedForUser,
} from "../../lib/offline/outbox";
import { navItemsFor } from "../../lib/navItems";

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const syncNow = useSyncNow();
  const [unsyncedOnLogout, setUnsyncedOnLogout] = useState(0);
  const [isSyncingForLogout, setIsSyncingForLogout] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  const finishLogout = async () => {
    await logout();
    // Replace the signed-in page so Back from the login page cannot reopen it.
    navigate("/login", { replace: true });
  };

  // Logging out with unsynced records is blocked until the user syncs them
  // or explicitly discards them.
  const handleLogout = async () => {
    if (user) {
      try {
        const { own } = await countUnsynced(user.id);
        if (own > 0) {
          setUnsyncedOnLogout(own);
          return;
        }
      } catch (error) {
        console.warn("AirTracer: could not check for unsynced records.", error);
      }
    }
    await finishLogout();
  };

  const handleSyncBeforeLogout = async () => {
    if (!user) return;
    setIsSyncingForLogout(true);
    setLogoutError(null);
    try {
      await syncNow({ force: true });
      const { own } = await countUnsynced(user.id);
      if (own === 0) {
        setUnsyncedOnLogout(0);
        await finishLogout();
      } else {
        setUnsyncedOnLogout(own);
        setLogoutError(
          `${own} record${own === 1 ? " is" : "s are"} still not synced.`,
        );
      }
    } catch (error) {
      console.warn("AirTracer: sync before logout failed.", error);
      setLogoutError("Sync failed. Check your connection and try again.");
    } finally {
      setIsSyncingForLogout(false);
    }
  };

  const handleDiscardAndLogout = async () => {
    if (!user) return;
    try {
      await discardUnsyncedForUser(user.id);
    } catch (error) {
      console.warn("AirTracer: could not discard unsynced records.", error);
      setLogoutError("The records could not be discarded.");
      return;
    }
    setUnsyncedOnLogout(0);
    await finishLogout();
  };

  const navItems = navItemsFor(user?.roles ?? []);

  return (
    <div className="min-h-screen bg-primary-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-primary-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="shrink-0 flex items-center">
                <Link
                  to="/dashboard"
                  className="text-xl font-black flex items-center gap-2"
                >
                  <img src="/logo.svg" alt="" className="h-9 w-auto" />
                  <span>
                    <span className="text-brand-primary">Air</span>
                    <span className="text-brand-secondary">Tracer</span>
                  </span>
                </Link>
              </div>
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `inline-flex items-center px-1 pt-1 border-b-2 text-sm transition-colors duration-200 
                    ${
                      isActive
                        ? "border-brand-secondary text-brand-tertiary font-bold"
                        : "border-transparent text-primary-500 hover:border-primary-300 hover:text-primary-700 font-medium"
                    }`
                    }
                  >
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              <div className="relative flex items-center gap-4">
                <SyncStatusIndicator />
                <InstallAppButton variant="header" />
                <AddRoleAction className="text-sm text-primary-500 hover:text-primary-700 disabled:opacity-50 disabled:cursor-not-allowed" />
                <span className="text-sm font-medium text-primary-700">
                  {user?.firstName} {user?.lastName}
                </span>
                <div className="h-8 w-8 rounded-full bg-brand-secondary-100 flex items-center justify-center text-brand-secondary-700 font-bold">
                  {user?.firstName?.[0] || ""}
                  {user?.lastName?.[0] || ""}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-primary-500 hover:text-primary-700"
                >
                  Logout
                </button>
              </div>
            </div>
            <div className="-mr-2 flex items-center gap-2 sm:hidden">
              <SyncStatusIndicator />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="mobile-menu"
                className={`inline-flex items-center justify-center p-2 rounded-lg transition-colors duration-200 hover:bg-accent-50 hover:text-brand-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent-500 ${
                  mobileMenuOpen
                    ? "bg-accent-50 text-brand-primary"
                    : "text-primary-400"
                }`}
              >
                <span className="sr-only">
                  {mobileMenuOpen ? "Close main menu" : "Open main menu"}
                </span>
                <span
                  aria-hidden="true"
                  className={`block transition-transform duration-200 motion-reduce:transition-none ${
                    mobileMenuOpen ? "rotate-90" : ""
                  }`}
                >
                  {mobileMenuOpen ? (
                    <svg
                      className="block h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="block h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {/* Always mounted so it can animate; inert keeps it out of tab order when closed. */}
        <div
          aria-hidden="true"
          onClick={() => setMobileMenuOpen(false)}
          className={`sm:hidden fixed inset-x-0 top-16 bottom-0 bg-brand-tertiary/20 transition-opacity duration-200 motion-reduce:transition-none ${
            mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
        <div
          id="mobile-menu"
          inert={!mobileMenuOpen}
          className={`sm:hidden absolute inset-x-0 top-full px-3 pt-2 ${
            mobileMenuOpen ? "" : "pointer-events-none"
          }`}
        >
          <div
            className={`rounded-xl bg-accent-50 border border-accent-100 shadow-dropdown origin-top transition duration-200 ease-out motion-reduce:transition-none ${
              mobileMenuOpen
                ? "opacity-100 translate-y-0 scale-100"
                : "opacity-0 -translate-y-2 scale-95"
            }`}
          >
            <div className="py-2 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `mx-2 block rounded-lg border-l-4 px-3 py-2.5 text-base font-medium transition-colors ${
                      isActive
                        ? "bg-white border-brand-secondary text-brand-tertiary shadow-sm"
                        : "border-transparent text-primary-600 hover:bg-accent-100 hover:text-brand-tertiary"
                    }`
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </NavLink>
              ))}
            </div>
            <div className="pt-4 pb-2 border-t border-accent-100">
              <div className="flex items-center px-5">
                <div className="shrink-0">
                  <div className="h-10 w-10 rounded-full bg-brand-secondary-100 flex items-center justify-center text-brand-secondary-700 font-bold text-lg">
                    {user?.firstName?.[0] || ""}
                    {user?.lastName?.[0] || ""}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-primary-800">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-sm font-medium text-primary-500">
                    {user?.email}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {/* The menu stays open so the instructions dialog stays mounted. */}
                <InstallAppButton variant="menu" />
                <AddRoleAction className="mx-2 block w-[calc(100%-1rem)] rounded-lg border-l-4 border-transparent px-3 py-2.5 text-left text-base font-medium text-primary-600 transition-colors hover:bg-accent-100 hover:text-brand-tertiary disabled:opacity-50 disabled:cursor-not-allowed" />
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="mx-2 block w-[calc(100%-1rem)] rounded-lg border-l-4 border-transparent px-3 py-2.5 text-left text-base font-medium text-primary-600 transition-colors hover:bg-accent-100 hover:text-brand-tertiary"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <OfflineBanner />

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      <ConfirmDialog
        open={unsyncedOnLogout > 0}
        title="Records not synced yet"
        confirmLabel={`Discard ${unsyncedOnLogout} and log out`}
        confirmPhrase="DISCARD"
        onConfirm={handleDiscardAndLogout}
        onCancel={() => {
          setUnsyncedOnLogout(0);
          setLogoutError(null);
        }}
        actions={
          isOnline ? (
            <Button
              variant="secondary"
              onClick={handleSyncBeforeLogout}
              isLoading={isSyncingForLogout}
            >
              Sync now
            </Button>
          ) : undefined
        }
      >
        <p>
          {unsyncedOnLogout} service record
          {unsyncedOnLogout === 1 ? " is" : "s are"} saved on this device but
          not uploaded yet. Logging out now deletes{" "}
          {unsyncedOnLogout === 1 ? "it" : "them"}.
        </p>
        {!isOnline && <p>Reconnect to sync before logging out.</p>}
        {logoutError && <p className="text-error-700">{logoutError}</p>}
      </ConfirmDialog>
    </div>
  );
}
