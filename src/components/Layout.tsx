import { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/auth.store";
import {
  LogOut,
  LayoutDashboard,
  Package,
  ShoppingCart,
  User,
  FileText,
  Settings,
  ChevronDown,
  ChevronRight,
  Archive,
  Store,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function Layout({ children, title }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [isPriceEditorOpen, setIsPriceEditorOpen] = useState(
    location.pathname.startsWith("/price-documents") ||
      location.pathname.startsWith("/price-types"),
  );
  const [isReportsOpen, setIsReportsOpen] = useState(
    location.pathname.startsWith("/reports"),
  );
  const [isOrganizationOpen, setIsOrganizationOpen] = useState(
    location.pathname.startsWith("/organization-settings"),
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const togglePriceEditor = () => setIsPriceEditorOpen(!isPriceEditorOpen);
  const toggleReports = () => setIsReportsOpen(!isReportsOpen);
  const toggleOrganization = () => setIsOrganizationOpen(!isOrganizationOpen);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex transition-colors duration-200">
      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={clsx(
          "fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out z-40 print:hidden",
          isSidebarOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
            RemoteOrder
          </h1>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {user?.role === "admin" && (
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                clsx(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                )
              }
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              {t("menu.dashboard")}
            </NavLink>
          )}

          <NavLink
            to="/products"
            className={({ isActive }) =>
              clsx(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
              )
            }
          >
            <Package className="mr-3 h-5 w-5" />
            {t("menu.products")}
          </NavLink>

          {/* Price Editor Group - Admin Only */}
          {user?.role === "admin" && (
            <div>
              <button
                onClick={togglePriceEditor}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <FileText className="mr-3 h-5 w-5" />
                  {t("menu.priceEditor")}
                </div>
                {isPriceEditorOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {isPriceEditorOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  <NavLink
                    to="/price-documents"
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                      )
                    }
                  >
                    <span className="w-5 mr-3"></span>{" "}
                    {/* Indent placeholder */}
                    {t("menu.priceSettings")}
                  </NavLink>
                  {/* Price Types - Assuming route /price-types exists or will exist */}
                  <NavLink
                    to="/price-types" // TODO: Create this route if not exists
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                      )
                    }
                  >
                    <span className="w-5 mr-3"></span>
                    {t("menu.priceTypes")}
                  </NavLink>
                </div>
              )}
            </div>
          )}

          {/* Reports Group */}
          <div>
            <button
              onClick={toggleReports}
              className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
            >
              <div className="flex items-center">
                <Archive className="mr-3 h-5 w-5" />
                Звіти
              </div>
              {isReportsOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>

            {isReportsOpen && (
              <div className="ml-4 mt-1 space-y-1">
                <NavLink
                  to="/reports/stock-balances"
                  className={({ isActive }) =>
                    clsx(
                      "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                    )
                  }
                >
                  <span className="w-5 mr-3"></span>
                  Залишки на складах
                </NavLink>
              </div>
            )}
          </div>

          <NavLink
            to="/counterparties"
            className={({ isActive }) =>
              clsx(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
              )
            }
          >
            <User className="mr-3 h-5 w-5" />
            {t("menu.counterparties", "Counterparties")}
          </NavLink>
          <NavLink
            to="/orders"
            className={({ isActive }) =>
              clsx(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
              )
            }
          >
            <ShoppingCart className="mr-3 h-5 w-5" />
            {t("menu.orders")}
          </NavLink>

          {user?.role === "admin" && (
            <NavLink
              to="/goods-receipt"
              className={({ isActive }) =>
                clsx(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                )
              }
            >
              <FileText className="mr-3 h-5 w-5" />
              {t("menu.goodsReceipt", "Goods Receipt")}
            </NavLink>
          )}

          <NavLink
            to="/realizations"
            className={({ isActive }) =>
              clsx(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
              )
            }
          >
            <FileText className="mr-3 h-5 w-5" />
            {t("menu.realizations", "Realizations")}
          </NavLink>

          {user?.role === "admin" && (
            <NavLink
              to="/orders/archive"
              className={({ isActive }) =>
                clsx(
                  "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                )
              }
            >
              <Archive className="mr-3 h-5 w-5" />
              {t("menu.archive", "Archive")}
            </NavLink>
          )}

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              clsx(
                "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
              )
            }
          >
            <Settings className="mr-3 h-5 w-5" />
            {t("menu.settings")}
          </NavLink>

          {user?.role === "admin" && (
            <div>
              <button
                onClick={toggleOrganization}
                className="flex items-center justify-between w-full px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white rounded-md transition-colors"
              >
                <div className="flex items-center">
                  <Store className="mr-3 h-5 w-5" />
                  {t("menu.organizationSettings", "Organization")}
                </div>
                {isOrganizationOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>

              {isOrganizationOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  <NavLink
                    to="/organization-settings/main"
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                      )
                    }
                  >
                    <span className="w-5 mr-3"></span>
                    Основні
                  </NavLink>
                  <NavLink
                    to="/organization-settings/users"
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white",
                      )
                    }
                  >
                    <span className="w-5 mr-3"></span>
                    Користувачі
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.email}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-4 flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300">
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 print:hidden">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="mr-4 md:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800">
              {title || "Dashboard"}
            </h2>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
