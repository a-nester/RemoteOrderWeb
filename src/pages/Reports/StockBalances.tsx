import { useState, useEffect, useMemo } from "react";
import { FileText, Filter, CheckSquare, Square, ChevronDown } from "lucide-react";
import {
  ReportsService,
  type StockBalance,
} from "../../services/reports.service";
import { OrganizationService } from "../../services/organization.service";
import type { Warehouse } from "../../types/organization";
import { format } from "date-fns";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";

export default function StockBalancesReport() {
  const user = useAuthStore((state) => state.user);
  const setPreferences = useAuthStore((state) => state.setPreferences);

  const [balances, setBalances] = useState<StockBalance[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);

  // Default to today
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [warehouseId, setWarehouseId] = useState("");
  const [sortBy, setSortBy] = useState("category");

  // Category filter state
  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    return user?.preferences?.reports?.hiddenStockCategories || [];
  });
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    loadReport();
  }, [date, warehouseId, sortBy]);

  // Sync preferences to backend when hiddenCategories change
  useEffect(() => {
    const currentPrefs = user?.preferences || {};
    const currentHidden = currentPrefs.reports?.hiddenStockCategories || [];
    
    // Only update if there's a real change to avoid infinite loops
    if (JSON.stringify(currentHidden) !== JSON.stringify(hiddenCategories)) {
      const newPrefs = {
        ...currentPrefs,
        reports: {
          ...(currentPrefs.reports || {}),
          hiddenStockCategories: hiddenCategories
        }
      };
      setPreferences(newPrefs);
      AuthService.updatePreferences(newPrefs).catch(err => 
        console.error("Failed to save stock category preferences", err)
      );
    }
  }, [hiddenCategories, setPreferences, user?.preferences]);

  // Derive available categories from current data payload
  const availableCategories = useMemo(() => {
      return Array.from(
        new Set(balances.map((b) => b.productCategory || "Без категорії"))
      ).sort();
  }, [balances]);

  // Apply hidden categories filter
  const filteredBalances = useMemo(() => {
    return balances.filter(b => !hiddenCategories.includes(b.productCategory || "Без категорії"));
  }, [balances, hiddenCategories]);

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

        {/* Category Filter Menu */}
        <div className="relative ml-auto sm:ml-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Категорії
          </label>
          <button
            onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
            className="flex items-center justify-between w-full sm:w-56 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-3 py-2 text-sm text-gray-700 dark:text-white"
          >
            <div className="flex items-center min-w-0 pr-2">
              <Filter className="mr-2 h-4 w-4 text-gray-400 shrink-0" />
              <span className="truncate">
                {hiddenCategories.length === 0 
                   ? "Всі категорії" 
                   : hiddenCategories.length === availableCategories.length && availableCategories.length > 0
                     ? "Жодної" 
                     : `Вибрано: ${Math.max(0, availableCategories.length - hiddenCategories.length)}`}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          </button>

          {isCategoryMenuOpen && (
            <div className="absolute z-20 mt-1 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-1 max-h-60 overflow-auto sm:right-auto right-0">
              <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700 flex justify-between">
                <button
                  type="button"
                  onClick={() => setHiddenCategories([])}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline"
                >
                  Вибрати всі
                </button>
                <button
                  type="button"
                  onClick={() => setHiddenCategories(availableCategories)}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Зняти всі
                </button>
              </div>
              {availableCategories.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500 text-center">
                  Немає даних
                </div>
              )}
              {availableCategories.map(cat => {
                const isHidden = hiddenCategories.includes(cat);
                return (
                  <div 
                    key={cat}
                    className="px-3 py-2 flex items-center hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => {
                      if (isHidden) {
                        setHiddenCategories(prev => prev.filter(c => c !== cat));
                      } else {
                        setHiddenCategories(prev => [...prev, cat]);
                      }
                    }}
                  >
                    {!isHidden ? (
                      <CheckSquare className="h-4 w-4 text-indigo-600 mr-2 shrink-0" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
                    )}
                    <span className="text-sm text-gray-700 dark:text-gray-200 truncate" title={cat}>
                      {cat}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          
          {/* Backdrop to close menu */}
          {isCategoryMenuOpen && (
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsCategoryMenuOpen(false)}
            />
          )}
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
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`} className="animate-pulse">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto"></div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : filteredBalances.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-gray-500"
                >
                  Немає даних для відображення
                </td>
              </tr>
            ) : (
              filteredBalances.map((row, idx) => (
                <tr
                  key={`${row.productId}-${row.warehouseName || "none"}-${idx}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {row.productCategory || "Без категорії"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium break-all whitespace-normal">
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
