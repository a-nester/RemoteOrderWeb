import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { Link } from "react-router-dom";
import { API_URL } from "../../constants/api";
import { useAuthStore } from "../../store/auth.store";
import { CounterpartyService } from "../../services/counterparty.service";
import type { Counterparty, CounterpartyGroup } from "../../types/counterparty";
import { FileText, Search, Printer, Plus, Minus } from "lucide-react";

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

interface GroupedReconciliation {
  counterpartyId: string;
  startBalance: number;
  endBalance: number;
  ledger: LedgerRow[];
}

export default function ReconciliationReport() {
  const { t } = useTranslation();
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [groups, setGroups] = useState<CounterpartyGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [groupedData, setGroupedData] = useState<GroupedReconciliation[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [hasData, setHasData] = useState(false);

  const [filters, setFilters] = useState({
    counterpartyId: "",
    groupId: "",
    dateFrom: new Date(new Date().setMonth(new Date().getMonth() - 1))
      .toISOString()
      .split("T")[0],
    dateTo: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    Promise.all([
      CounterpartyService.getAll(),
      CounterpartyService.getGroups(),
    ]).then(([cpRes, gRes]) => {
      setCounterparties(cpRes);
      setGroups(gRes);
    });
  }, []);

  const fetchReport = async () => {
    if (!filters.counterpartyId && !filters.groupId) {
      alert("Оберіть контрагента або групу");
      return;
    }
    try {
      setLoading(true);
      const token = useAuthStore.getState().token;
      const params = new URLSearchParams();
      if (filters.counterpartyId)
        params.append("counterpartyId", filters.counterpartyId);
      if (filters.groupId) params.append("groupId", filters.groupId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const res = await axios.get(
        `${API_URL}/reports/reconciliation?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setGroupedData(res.data.grouped || []);
      setHasData(true);
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
  const selectedGroup = groups.find((g) => g.id === filters.groupId);

  const getTargetName = () => {
    if (selectedCp) return selectedCp.name;
    if (selectedGroup) return `Група: ${selectedGroup.name}`;
    return "________________";
  };

  const getCpName = (id: string) => {
    return (
      counterparties.find((c) => c.id === id)?.name || "Невідомий контрагент"
    );
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const globalDebit = groupedData.reduce(
    (acc, g) =>
      acc + g.ledger.reduce((sum, r) => sum + (parseFloat(r.debit) || 0), 0),
    0,
  );
  const globalCredit = groupedData.reduce(
    (acc, g) =>
      acc + g.ledger.reduce((sum, r) => sum + (parseFloat(r.credit) || 0), 0),
    0,
  );
  const globalEndBalance = groupedData.reduce(
    (acc, g) => acc + g.endBalance,
    0,
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
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-5 gap-4 print:hidden">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Група контрагентів
          </label>
          <select
            value={filters.groupId}
            onChange={(e) =>
              setFilters({
                ...filters,
                groupId: e.target.value,
                counterpartyId: "",
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Всі групи...</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Контрагент
          </label>
          <select
            value={filters.counterpartyId}
            onChange={(e) =>
              setFilters({
                ...filters,
                counterpartyId: e.target.value,
                groupId: "",
              })
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Без вибору / Оберіть контрагента...</option>
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
          між Нами та {getTargetName()}
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
                  className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Дата
                </th>
                <th
                  scope="col"
                  className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2 w-[35%]"
                >
                  Документ
                </th>
                <th
                  scope="col"
                  className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Сальдо на початок
                </th>
                <th
                  scope="col"
                  className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Дебет (+)
                </th>
                <th
                  scope="col"
                  className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Кредит (-)
                </th>
                <th
                  scope="col"
                  className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider print:text-black print:px-2"
                >
                  Борг контрагента
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 print:divide-black">
              {hasData &&
                groupedData.map((group) => {
                  const isExpanded = expandedGroups[group.counterpartyId];
                  return (
                    <React.Fragment key={group.counterpartyId}>
                      {/* Header Row for the Group */}
                      <tr
                        className="bg-gray-100 dark:bg-gray-700/80 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer print:bg-gray-300"
                        onClick={() => toggleGroup(group.counterpartyId)}
                      >
                        <td
                          colSpan={5}
                          className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white print:px-2"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              className="mr-2 p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-500 print:hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleGroup(group.counterpartyId);
                              }}
                            >
                              {isExpanded ? (
                                <Minus className="h-4 w-4" />
                              ) : (
                                <Plus className="h-4 w-4" />
                              )}
                            </button>
                            {/* Fallback for print if needed */}
                            <span className="hidden print:inline-block mr-1">
                              {isExpanded ? "-" : "+"}
                            </span>
                            {getCpName(group.counterpartyId)}
                          </div>
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white print:px-2">
                          {formatMoney(group.endBalance)}
                        </td>
                      </tr>

                      {/* Expaned Rows */}
                      {isExpanded && (
                        <>
                          {group.ledger.length === 0 && (
                            <tr className="bg-gray-50 dark:bg-gray-700/50 print:bg-gray-200 font-semibold">
                              <td
                                colSpan={5}
                                className="px-6 py-2 text-sm text-gray-900 dark:text-white print:px-2 text-right"
                              >
                                Сальдо на початок періоду ({filters.dateFrom}):
                              </td>
                              <td className="px-6 py-2 text-right text-sm text-gray-900 dark:text-white print:px-2">
                                {formatMoney(group.startBalance)}
                              </td>
                            </tr>
                          )}
                          {group.ledger.map((row, i) => {
                            // Calculate balance before this transaction
                            const balanceBefore =
                              row.runningBalance -
                              (parseFloat(row.balanceChange) || 0);

                            return (
                              <tr
                                key={`${row.documentId}-${i}`}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                              >
                                <td className="px-6 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white print:px-2 pl-12">
                                  {dtFormat(row.date)}
                                </td>
                                <td className="px-6 py-2 text-sm text-gray-900 dark:text-white print:px-2">
                                  {row.type === "REALIZATION" && (
                                    <Link
                                      to={`/realizations/${row.documentId}`}
                                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      Реалізація №{row.docNumber}
                                    </Link>
                                  )}
                                  {row.type === "GOODS_RECEIPT" && (
                                    <Link
                                      to={`/receipts/${row.documentId}`}
                                      className="text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                      Надходження №{row.docNumber}
                                    </Link>
                                  )}
                                  {row.type === "INCOME" && (
                                    <span className="text-gray-900 dark:text-white">
                                      Прибутковий ордер №{row.docNumber}
                                    </span>
                                  )}
                                  {row.type === "OUTCOME" && (
                                    <span className="text-gray-900 dark:text-white">
                                      Видатковий ордер №{row.docNumber}
                                    </span>
                                  )}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white print:px-2 font-medium">
                                  {i === 0
                                    ? formatMoney(group.startBalance)
                                    : formatMoney(balanceBefore)}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white print:px-2">
                                  {parseFloat(row.debit) !== 0
                                    ? formatMoney(row.debit)
                                    : ""}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-right text-sm text-gray-900 dark:text-white print:px-2">
                                  {parseFloat(row.credit) !== 0
                                    ? formatMoney(row.credit)
                                    : ""}
                                </td>
                                <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white print:px-2">
                                  {formatMoney(row.runningBalance)}
                                </td>
                              </tr>
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
              {!hasData && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    Натисніть "Сформувати" для отримання даних
                  </td>
                </tr>
              )}
            </tbody>
            {hasData && (
              <tfoot className="bg-gray-200 dark:bg-gray-700 print:bg-gray-300">
                <tr>
                  <td
                    colSpan={3}
                    className="px-6 py-2 text-right text-sm font-bold text-gray-900 dark:text-white print:text-black uppercase"
                  >
                    Всього по звіту:
                  </td>
                  <td className="px-6 py-2 text-right text-sm font-bold text-gray-900 dark:text-white print:text-black">
                    {formatMoney(globalDebit)}
                  </td>
                  <td className="px-6 py-2 text-right text-sm font-bold text-gray-900 dark:text-white print:text-black">
                    {formatMoney(globalCredit)}
                  </td>
                  <td className="px-6 py-2 text-right text-sm font-bold text-gray-900 dark:text-white print:text-black">
                    {formatMoney(globalEndBalance)}
                    {globalEndBalance > 0 && (
                      <span className="text-xs font-normal text-gray-500 ml-1">
                        (Нам винні)
                      </span>
                    )}
                    {globalEndBalance < 0 && (
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
