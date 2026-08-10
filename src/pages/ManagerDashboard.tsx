import { useState, useEffect } from "react";
import { Package, ShoppingBag, RotateCcw, Users, MapPin, FileText } from "lucide-react";
import type { User } from "../services/users.service";
import type { Counterparty } from "../types/counterparty";
import type { Territory } from "../types/territory";
import { CounterpartyService } from "../services/counterparty.service";
import { TerritoryService } from "../services/territory.service";
import { OrderService } from "../services/order.service";
import { RealizationService } from "../services/realization.service";
import { buyerReturnService } from "../services/buyerReturnService";

interface ManagerDashboardProps {
  managerUser: User;
}

export default function ManagerDashboard({ managerUser }: ManagerDashboardProps) {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [realizations, setRealizations] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<"orders" | "clients">("orders");

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [terrs, cps, ords, reals, rets] = await Promise.all([
          TerritoryService.getAll().catch(() => []),
          CounterpartyService.getAll().catch(() => []),
          OrderService.getOrders({}).catch(() => []),
          RealizationService.getAll().catch(() => []),
          buyerReturnService.getAll().catch(() => []),
        ]);

        setTerritories(terrs);

        // Filter counterparties by manager's visibleTerritories
        const visibleTerrIds = managerUser.visibleTerritories || [];
        const managerCps = visibleTerrIds.length > 0
          ? cps.filter((c: Counterparty) => c.territoryId && visibleTerrIds.includes(c.territoryId))
          : cps;

        setCounterparties(managerCps);

        const managerCpIds = new Set(managerCps.map((c: Counterparty) => String(c.id)));

        // Filter documents by manager counterparties
        const managerOrds = ords.filter((o: any) => o.counterpartyId && managerCpIds.has(String(o.counterpartyId)));
        const managerReals = reals.filter((r: any) => r.counterpartyId && managerCpIds.has(String(r.counterpartyId)));
        const managerRets = rets.filter((br: any) => br.counterpartyId && managerCpIds.has(String(br.counterpartyId)));

        setOrders(managerOrds);
        setRealizations(managerReals);
        setReturns(managerRets);
      } catch (err) {
        console.error("Failed to load manager dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [managerUser]);

  // Assigned territory names
  const assignedTerritoryNames = territories
    .filter((t: Territory) => (managerUser.visibleTerritories || []).includes(t.id))
    .map((t: Territory) => t.name);

  // Totals calculations
  const totalOrdersAmount = orders.reduce((sum: number, o: any) => sum + (Number(o.total || o.amount) || 0), 0);
  const totalRealizationsAmount = realizations.reduce((sum: number, r: any) => sum + (Number(r.amount) || 0), 0);
  const totalReturnsAmount = returns.reduce((sum: number, br: any) => sum + (Number(br.totalAmount) || 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500 dark:text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
        Завантаження даних дашборду менеджера...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 rounded-lg p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              <Users className="h-3.5 w-3.5" /> Менеджерський Дашборд
            </div>
            <h2 className="text-2xl font-bold">{managerUser.email}</h2>
            <p className="text-indigo-100 text-sm mt-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              Прив'язані території:{" "}
              {assignedTerritoryNames.length > 0 ? (
                <span className="font-semibold">{assignedTerritoryNames.join(", ")}</span>
              ) : (
                <span className="italic text-indigo-200">Всі території (не обмежено)</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-lg border border-white/10">
            <div className="text-right">
              <div className="text-xs text-indigo-200 uppercase font-medium">Закріплено клієнтів</div>
              <div className="text-xl font-bold">{counterparties.length} клієнтів</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Замовлення */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Замовлення
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {orders.length}
              </h3>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">
                {totalOrdersAmount.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} ₴
              </p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Package className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Продажі / Реалізації */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Реалізації (Продажі)
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {realizations.length}
              </h3>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                {totalRealizationsAmount.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} ₴
              </p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <ShoppingBag className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Повернення */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Повернення покупців
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {returns.length}
              </h3>
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mt-1">
                {totalReturnsAmount.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} ₴
              </p>
            </div>
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg">
              <RotateCcw className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* Клієнти */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Клієнти на території
              </p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {counterparties.length}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Активні у вибраних територіях
              </p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 pt-3">
          <button
            onClick={() => setActiveTab("orders")}
            className={`pb-3 px-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
              activeTab === "orders"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <FileText className="h-4 w-4" />Останні замовлення ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab("clients")}
            className={`pb-3 px-4 text-sm font-medium border-b-2 flex items-center gap-2 ${
              activeTab === "clients"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <Users className="h-4 w-4" />Клієнти території ({counterparties.length})
          </button>
        </div>

        <div className="p-4">
          {activeTab === "orders" && (
            <div className="overflow-x-auto">
              {orders.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  У цього менеджера поки немає замовлень за вибраними територіями
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Дата / Номер
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Клієнт
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Статус
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Сума (₴)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {orders.slice(0, 15).map((ord: any) => (
                      <tr key={ord.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                          {ord.docNumber || ord.number || `#${String(ord.id).slice(0, 8)}`}
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(ord.createdAt || ord.date).toLocaleDateString("uk-UA")}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {ord.counterpartyName || "Не вказано"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                            {ord.status || "НОВЕ"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                          {(Number(ord.amount || ord.total) || 0).toLocaleString("uk-UA", { minimumFractionDigits: 2 })} ₴
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === "clients" && (
            <div className="overflow-x-auto">
              {counterparties.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Немає прив'язаних клієнтів у вибраних територіях
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Назва контрагента
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Територія
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Телефон / Контакт
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Адреса
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {counterparties.map((cp: Counterparty) => (
                      <tr key={cp.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {cp.name}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {cp.territoryName ? (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                              {cp.territoryName}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs italic">не задано</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                          {cp.phone || cp.contactPerson || "-"}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {cp.address || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
