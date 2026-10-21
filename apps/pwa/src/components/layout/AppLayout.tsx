import { useState } from "react";
import { Link, Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function AppLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [];
  if (hasRole("OWNER")) {
    navItems.push({ name: "Dashboard", path: "/dashboard" });
    navItems.push({ name: "My Equipments", path: "/equipment" });
    navItems.push({ name: "Scan QR", path: "/scan" });
  } else if (hasRole("TECHNICIAN")) {
    navItems.push({ name: "Dashboard", path: "/dashboard" });
    navItems.push({ name: "Scan QR", path: "/scan" });
    navItems.push({ name: "Service Records", path: "/service-records" });
  } else if (hasRole("ADMIN")) {
    navItems.push({ name: "Dashboard", path: "/dashboard" });
    navItems.push({ name: "Users", path: "/users" });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="shrink-0 flex items-center">
                <Link
                  to="/dashboard"
                  className="text-xl font-black text-slate-900 flex items-center gap-2"
                >
                  <svg
                    className="w-6 h-6 text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                  AirTracer
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
                        ? "border-blue-600 text-slate-900 font-bold"
                        : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 font-medium"
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
                <span className="text-sm font-medium text-slate-700">
                  {user?.firstName} {user?.lastName}
                </span>
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                  {user?.firstName?.[0] || ""}
                  {user?.lastName?.[0] || ""}
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  Logout
                </button>
              </div>
            </div>
            <div className="-mr-2 flex items-center sm:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-slate-500 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              >
                <span className="sr-only">Open main menu</span>
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
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-200">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    isActive
                      ? "bg-blue-50 border-blue-600 text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                      : "border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
                  }
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </NavLink>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-slate-200">
              <div className="flex items-center px-4">
                <div className="shrink-0">
                  <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {user?.firstName?.[0] || ""}
                    {user?.lastName?.[0] || ""}
                  </div>
                </div>
                <div className="ml-3">
                  <div className="text-base font-medium text-slate-800">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-sm font-medium text-slate-500">
                    {user?.email}
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
