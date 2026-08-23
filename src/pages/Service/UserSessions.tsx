import { useState, useEffect, useMemo } from "react";
import {
  SessionService,
  type UserSessionItem,
} from "../../services/session.service";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Smartphone,
  Globe,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export default function UserSessions() {
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 30;

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await SessionService.getSessions({
        search: searchQuery || undefined,
        role: selectedRole !== "ALL" ? selectedRole : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setSessions(data.sessions || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error("Failed to load user sessions:", err);
      setError(err?.response?.data?.error || "Помилка завантаження сесій входу");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, selectedRole]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  // KPI Metrics
  const uniqueEmails = useMemo(() => {
    return new Set(sessions.map((s) => s.userEmail)).size;
  }, [sessions]);

  const uniqueDevices = useMemo(() => {
    return new Set(sessions.map((s) => s.device)).size;
  }, [sessions]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Адміністратор
          </span>
        );
      case "manager":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
            Менеджер
          </span>
        );
      case "client":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Клієнт
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 p-4 max-w-[1400px] mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-4 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            Моніторинг сесій входу
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Журнал авторизацій та запису пристроїв/регіонів входу користувачів
          </p>
        </div>
        <button
          onClick={() => {
            setPage(1);
            fetchData();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium text-sm shadow-sm"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Оновити
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Всього сесій у базі
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {total}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Унікальних акаунтів (на сторінці)
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {uniqueEmails}
            </div>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Типів пристроїв
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">
              {uniqueDevices}
            </div>
          </div>
        </div>
      </div>

      {/* Filters Header */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex gap-4 flex-wrap items-end border-b pb-4 border-gray-200 dark:border-gray-700 shadow-sm rounded-lg p-4 bg-white dark:bg-gray-800"
      >
        <div className="flex-1 min-w-[240px]">
          <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300 font-medium">
            Пошук за логіном, IP або пристроєм
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Введіть email, IP адреси..."
              className="pl-9 w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300 font-medium">
            Роль користувача
          </label>
          <select
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 dark:text-white text-sm min-w-[160px]"
          >
            <option value="ALL">Всі ролі</option>
            <option value="admin">Адміністратори</option>
            <option value="manager">Менеджери</option>
            <option value="client">Клієнти</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300 font-medium">
            Дата від
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1 text-gray-600 dark:text-gray-300 font-medium">
            Дата до
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>

        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-1.5 rounded-md font-medium text-sm transition-colors shadow-sm"
        >
          Застосувати
        </button>
      </form>

      {/* Content Table */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md font-medium text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-gray-500 dark:text-gray-400 animate-pulse">
          Завантаження історії сесій входу...
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Дата та час входу
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Користувач (Логін)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Роль
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Пристрій / ОС / Браузер
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    IP-адреса
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Регіон / Мережа
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sessions.map((item, index) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {new Date(item.loginTime).toLocaleString("uk-UA")}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.userEmail}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {getRoleBadge(item.userRole)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="font-medium">{item.device}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {item.ipAddress}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        <span>{item.region}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {sessions.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 text-sm"
                    >
                      Сесій входу не знайдено за вибраними фільтрами.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Показано {(page - 1) * pageSize + 1} -{" "}
                {Math.min(page * pageSize, total)} з {total} записів
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 px-2">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
