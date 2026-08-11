import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import CollectionPlanner from "./Admin/CollectionPlanner/CollectionPlanner";
import { useAuthStore } from "../store/auth.store";
import { UsersService } from "../services/users.service";
import type { User } from "../services/users.service";
import { Users, ShieldCheck } from "lucide-react";

export default function Dashboard() {
  const loggedUser = useAuthStore((state) => state.user);
  const [managers, setManagers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  useEffect(() => {
    if (loggedUser?.role === "admin") {
      UsersService.getUsers()
        .then((users) => {
          const mgrList = users.filter((u) => u.role === "manager");
          setManagers(mgrList);
        })
        .catch(console.error);
    }
  }, [loggedUser]);

  // Active targetUserId for schedule memory:
  // Admin can select via dropdown (defaults to admin's own ID or selected manager's ID).
  // Managers automatically use their logged-in user ID.
  const activeUserId = loggedUser?.role === "admin"
    ? (selectedUserId || (loggedUser?.id ? String(loggedUser.id) : undefined))
    : (loggedUser?.id ? String(loggedUser.id) : undefined);

  return (
    <Layout title="Dashboard">
      <div className="space-y-4">
        {/* Admin Dropdown Switcher */}
        {loggedUser?.role === "admin" && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-gray-800 dark:text-white font-semibold text-sm">
              <ShieldCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span>Панель перемикання планувальників (Адміністратор)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-500" />
              <label className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                Обрати планувальник:
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Власний планувальник (Адміністратор)</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    Менеджер: {m.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Dashboard View - Collection Planner with per-user schedule memory */}
        <div className="h-[calc(100vh-11rem)]">
          <CollectionPlanner targetUserId={activeUserId} />
        </div>
      </div>
    </Layout>
  );
}
