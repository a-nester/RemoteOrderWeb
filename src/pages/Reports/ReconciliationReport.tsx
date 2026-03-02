import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/auth.store";
import { CounterpartyService } from "../../services/counterparty.service";
import type { Counterparty } from "../../types/counterparty";
import { FileText, Search, Printer } from "lucide-react";

interface LedgerRow {
  documentId: string;
  date: string;
  type: string;
  docNumber: string;
  debit: string;
  credit: string;
  balanceChange: string;
  runningBalance: number;
  comment: string | null;
}

export default function ReconciliationReport() {
  const { t } = useTranslation();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [endBalance, setEndBalance] = useState<number>(0);

  const [filters, setFilters] = useState({
    counterpartyId: "",
    dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    CounterpartyService.getAll().then(setCounterparties);
  }, []);

  const fetchReport = async () => {
    if (!filters.counterpartyId) {
      alert("Оберіть контрагента");
      return;
    }
    try {
      setLoading(true);
      const token = useAuthStore.getState().token;
      const params = new URLSearchParams();
      if (filters.counterpartyId)
        params.append("counterpartyId", filters.counterpartyId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const res = await axios.get(
        `${API_URL}/reports/reconciliation?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setLedger(res.data.ledger);
      setEndBalance(res.data.endBalance);
    } catch (error) {
      console.error("Error fetching reconciliation:", error);
      alert("Помилка завантаження звіту");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const dtFormat = (d: string) => new Date(d).toLocaleString();
  const formatMoney = (m: number | string) =>
    parseFloat(m.toString()).toFixed(2);

  const selectedCp = counterparties.find(
    (c) => c.id === filters.counterpartyId,
  );

  return (
    <div className="space-y-6 print:space-y-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="h-6 w-6" /> Акт звірки взаєморозрахунків
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
            Контрагент
          </label>
          <select
            value={filters.counterpartyId}
            onChange={(e) =>
              setFilters({ ...filters, counterpartyId: e.target.value })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Оберіть контрагента...</option>
            {counterparties.map((cp) => (
              <option key={cp.id} value={cp.id}>
                {cp.name}
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
        <h2 className="text-xl font-bold">Акт звірки взаєморозрахунків</h2>
        <div className="text-sm mt-2">
          між Нами та {selectedCp?.name || "________________"}
          <br />
          за період з {filters.dateFrom || "..."} по {filters.dateTo || "..."}
        </div>
      </div>

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
                  Документ
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Дебет (+)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Кредит (-)
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Борг контрагента
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 print:divide-black">
              {ledger.map((row, i) => (
                <tr
                  key={`${row.documentId}-${i}`}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white print:px-2">
                    {dtFormat(row.date)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white print:px-2">
                    {row.type === "REALIZATION" &&
                      `Реалізація №${row.docNumber}`}
                    {row.type === "GOODS_RECEIPT" &&
                      `Надходження №${row.docNumber}`}
                    {row.type === "INCOME" &&
                      `Прибутковий ордер №${row.docNumber}`}
                    {row.type === "OUTCOME" &&
                      `Видатковий ордер №${row.docNumber}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white print:px-2">
                    {parseFloat(row.debit) !== 0 ? formatMoney(row.debit) : ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white print:px-2">
                    {parseFloat(row.credit) !== 0
                      ? formatMoney(row.credit)
                      : ""}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white print:px-2">
                    {formatMoney(row.runningBalance)}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Натисніть "Сформувати" для отримання даних
                  </td>
                </tr>
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot className="bg-gray-50 dark:bg-gray-700 print:bg-transparent">
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white print:text-black"
                  >
                    Кінцеве сальдо:
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-bold text-gray-900 dark:text-white print:text-black">
                    {formatMoney(endBalance)}
                    {endBalance > 0 && (
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        (Нам винні)
                      </span>
                    )}
                    {endBalance < 0 && (
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        (Ми винні)
                      </span>
                    )}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
