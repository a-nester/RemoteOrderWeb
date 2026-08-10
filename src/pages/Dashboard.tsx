import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import CollectionPlanner from "./Admin/CollectionPlanner/CollectionPlanner";
import ManagerDashboard from "./ManagerDashboard";
import { useAuthStore } from "../store/auth.store";
import { UsersService, User } from "../services/users.service";
import { Users, ShieldCheck } from "lucide-react";

export default function Dashboard() {
  const loggedUser = useAuthStore((state) => state.user);
  const [managers, setManagers] = useState<User[]>([]);
  const [selectedManagerEmail, setSelectedManagerEmail] = useState<string>("manager@test.com");

  useEffect(() => {
    if (loggedUser?.role === "admin") {
      UsersService.getUsers()
        .then((users) => {
          const mgrList = users.filter((u) => u.role === "manager" || u.email === "manager@test.com");
          setManagers(mgrList);
        })
        .catch(console.error);
    }
  }, [loggedUser]);

  // Determine active view:
  // Admin can select via dropdown (defaults to manager@test.com).
  // Non-admin managers see their own email dashboard.
  const activeEmail = loggedUser?.role === "admin"
    ? selectedManagerEmail
    : (loggedUser?.email || "manager@test.com");

  const selectedManagerUser = managers.find((m) => m.email === activeEmail) || {
    id: "active",
    email: activeEmail,
    role: "manager" as const,
    visibleTerritories: [],
  };

  return (
    <Layout title="Dashboard">
      <div className="space-y-4">
        {/* Admin Dropdown Switcher */}
        {loggedUser?.role === "admin" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold text-sm">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Панель перемикання дашбордів (Адміністратор)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Обрати дашборд:
              </label>
              <select
                value={selectedManagerEmail}
                onChange={(e) => setSelectedManagerEmail(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="manager@test.com">Менеджер: manager@test.com (Планувальник)</option>
                {managers
                  .filter((m) => m.email !== "manager@test.com")
                  .map((m) => (
                    <option key={m.id} value={m.email}>
                      Менеджер: {m.email}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* Render Dashboard View */}
        {activeEmail === "manager@test.com" ? (
          <div className="h-[calc(100vh-10rem)]">
            <CollectionPlanner />
          </div>
        ) : (
          <ManagerDashboard managerUser={selectedManagerUser} />
        )}
      </div>
    </Layout>
  );
}
