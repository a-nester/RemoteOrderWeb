import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/auth.store";
import { FinanceService } from "../../services/finance.service";
import type { Cashbox } from "../../services/finance.service";
import {
  Wallet,
  Search,
  Printer,
  ArrowDownRight,
  ArrowUpRight,
} from "lucide-react";

interface CashFlowRow {
  id: string;
  date: string;
  number: string;
  type: "INCOME" | "OUTCOME";
  amount: string;
  cashboxName: string;
  categoryName: string;
  counterpartyName: string | null;
  comment: string;
  runningBalance: number;
}

export default function CashFlowReport() {
  const { t } = useTranslation();
  const [cashboxes, setCashboxes] = useState<Cashbox[]>([]);
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<CashFlowRow[]>([]);
  const [hasData, setHasData] = useState(false);
  const [incomesByCategory, setIncomesByCategory] = useState<
    { name: string; amount: number }[]
  >([]);
  const [outcomesByCategory, setOutcomesByCategory] = useState<
    { name: string; amount: number }[]
  >([]);
  const [totals, setTotals] = useState({
    startBalance: 0,
    endBalance: 0,
    totalIncome: 0,
    totalOutcome: 0,
  });

  const [filters, setFilters] = useState({
    cashboxId: "",
    dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    FinanceService.getCashboxes().then(setCashboxes);
  }, []);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const token = useAuthStore.getState().token;
      const params = new URLSearchParams();
      if (filters.cashboxId) params.append("cashboxId", filters.cashboxId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const res = await axios.get(
        `${API_URL}/reports/cashflow?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setLedger(res.data.ledger);
      setTotals({
        startBalance: res.data.startBalance || 0,
        endBalance: res.data.endBalance,
        totalIncome: res.data.totalIncome,
        totalOutcome: res.data.totalOutcome,
      });
      setIncomesByCategory(res.data.incomesByCategory || []);
      setOutcomesByCategory(res.data.outcomesByCategory || []);
      setHasData(true);
    } catch (error) {
      console.error("Error fetching cashflow:", error);
      alert("Помилка завантаження звіту");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => window.print();
  const dtFormat = (d: string) => new Date(d).toLocaleString();
  const formatMoney = (m: number | string) =>
    parseFloat(m.toString()).toFixed(2);
  const selectedCb = cashboxes.find((c) => c.id === filters.cashboxId);

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Рух коштів
        </h1>
        <button
          onClick={handlePrint}
          className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <Printer className="h-5 w-5 mr-2" />
          {t("common.print")}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Каса / Рахунок
          </label>
          <select
            value={filters.cashboxId}
            onChange={(e) =>
              setFilters({ ...filters, cashboxId: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Всі каси...</option>
            {cashboxes.map((cb) => (
              <option key={cb.id} value={cb.id}>
                {cb.name} ({cb.currency})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            З
          </label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) =>
              setFilters({ ...filters, dateFrom: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            По
          </label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="w-full flex justify-center items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            <Search className="h-4 w-4 mr-2" />
            Сформувати
          </button>
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-8 text-center uppercase tracking-wider">
        <h2 className="text-xl font-bold">Звіт про рух коштів</h2>
        <div className="text-sm mt-2">
          Каса:{" "}
          {selectedCb
            ? `${selectedCb.name} (${selectedCb.currency})`
            : "Всі каси"}
          <br />
          Період: з {filters.dateFrom || "..."} по {filters.dateTo || "..."}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:flex print:gap-8 print:mb-6">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 print:bg-gray-100">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Початковий залишок
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white print:text-black mt-1">
            {formatMoney(totals.startBalance)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Надходження (Дебет)
          </div>
          <div className="text-xl font-bold text-green-600 mt-1">
            {formatMoney(totals.totalIncome)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Витрати (Кредит)
          </div>
          <div className="text-xl font-bold text-red-600 mt-1">
            {formatMoney(totals.totalOutcome)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 print:bg-gray-100">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Кінцевий залишок
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white print:text-black mt-1">
            {formatMoney(totals.endBalance)}
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {hasData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:hidden">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Деталізація надходжень
            </h3>
            <div className="space-y-3">
              {incomesByCategory.length === 0 ? (
                <div className="text-sm text-gray-500">Немає надходжень</div>
              ) : (
                incomesByCategory.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-300">
                      {cat.name}
                    </span>
                    <span className="font-semibold text-green-600">
                      {formatMoney(cat.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Деталізація витрат
            </h3>
            <div className="space-y-3">
              {outcomesByCategory.length === 0 ? (
                <div className="text-sm text-gray-500">Немає витрат</div>
              ) : (
                outcomesByCategory.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-gray-600 dark:text-gray-300">
                      {cat.name}
                    </span>
                    <span className="font-semibold text-red-600">
                      {formatMoney(cat.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden print:shadow-none print:border-none">
        {/* Ledger */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 print:text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 print:bg-transparent">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Дата
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Ордер
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Каса
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Стаття / Контрагент
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Надходження (+)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Витрата (-)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Залишок
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 print:divide-black">
              {hasData && (
                <tr className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-200 font-semibold">
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-sm text-gray-900 dark:text-white print:px-2 text-right"
                  >
                    Початковий залишок ({filters.dateFrom}):
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-900 dark:text-white print:px-2">
                    {formatMoney(totals.startBalance)}
                  </td>
                </tr>
              )}
              {ledger.map((row, i) => (
                <tr
                  key={`${row.id}-${i}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white print:px-2">
                    {dtFormat(row.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white print:px-2 flex items-center gap-2">
                    {row.type === "INCOME" ? (
                      <ArrowDownRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    )}
                    №{row.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 print:px-2">
                    {row.cashboxName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white print:px-2">
                    <div className="font-medium">{row.categoryName}</div>
                    <div className="text-gray-500 text-xs">
                      {row.counterpartyName}
                    </div>
                    <div className="text-gray-400 text-xs italic">
                      {row.comment}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-green-600 dark:text-green-400 print:px-2 print:text-black">
                    {row.type === "INCOME" ? formatMoney(row.amount) : ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600 dark:text-red-400 print:px-2 print:text-black">
                    {row.type === "OUTCOME" ? formatMoney(row.amount) : ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-900 dark:text-white print:px-2">
                    {formatMoney(row.runningBalance)}
                  </td>
                </tr>
              ))}
              {!hasData && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Натисніть "Сформувати" для отримання даних
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
