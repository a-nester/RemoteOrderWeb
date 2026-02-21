import { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import {
  ReportsService,
  type StockBalance,
} from "../../services/reports.service";
import { OrganizationService } from "../../services/organization.service";
import type { Warehouse } from "../../types/organization";
import { format } from "date-fns";

export default function StockBalancesReport() {
  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to today
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [warehouseId, setWarehouseId] = useState("");
  const [sortBy, setSortBy] = useState("category");

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadReport();
  }, [date, warehouseId, sortBy]);

  const loadWarehouses = async () => {
    try {
      const data = await OrganizationService.getWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error("Failed to load warehouses", error);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await ReportsService.getStockBalances(
        date,
        warehouseId,
        sortBy,
      );
      setBalances(data);
    } catch (error) {
      console.error("Failed to load stock balances report", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <FileText className="mr-2" />
          Звіт: Залишки товарів на складах
        </h1>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            На дату
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Склад
          </label>
          <select
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Всі склади</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Сортування
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="category">За групами</option>
            <option value="name">За назвою</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Категорія
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Товар
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Склад
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                В наявності
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Вартість
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  Завантаження...
                </td>
              </tr>
            ) : balances.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-6 py-4 text-center text-sm text-gray-500"
                >
                  Немає даних на обрану дату
                </td>
              </tr>
            ) : (
              balances.map((row, idx) => (
                <tr
                  key={`${row.productId}-${row.warehouseName || "none"}-${idx}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {row.productCategory || "Без категорії"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                    {row.productName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {row.warehouseName || "Без складу"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white">
                    {Number(row.balance).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {Number(row.totalValue || 0).toFixed(2)} ₴
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
