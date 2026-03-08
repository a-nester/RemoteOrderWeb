import { useState, useEffect, useMemo, Fragment } from "react";
import { useTranslation } from "react-i18next";
import {
  Search,
  FileText,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { ReportsService } from "../../services/reports.service";
import type { InventoryMovement } from "../../services/reports.service";
import { OrganizationService } from "../../services/organization.service";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";
import { Link } from "react-router-dom";

export default function InventoryReport() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const setPreferences = useAuthStore((state) => state.setPreferences);

  // Load initial preferences from user store
  const savedPrefs = user?.preferences?.inventoryReport || {};

  const [data, setData] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filters
  const [warehouseId, setWarehouseId] = useState<string>(
    savedPrefs.warehouseId || "",
  );
  const [startDate, setStartDate] = useState<string>(
    savedPrefs.startDate || new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState<string>(
    savedPrefs.endDate || new Date().toISOString().split("T")[0],
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Sorting (local matching Realizations style)
  const [sortField, setSortField] =
    useState<keyof InventoryMovement>("productName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    OrganizationService.getWarehouses()
      .then(setWarehouses)
      .catch(console.error);
  }, []);

  const handleGenerate = async () => {
    if (!warehouseId || !startDate || !endDate) return;

    setLoading(true);
    try {
      const result = await ReportsService.getInventoryMovement(
        startDate,
        endDate,
        warehouseId,
      );
      setData(result);

      // Save user preferences
      const newPrefs = {
        ...user?.preferences,
        inventoryReport: { warehouseId, startDate, endDate },
      };
      setPreferences(newPrefs);
      AuthService.updatePreferences(newPrefs).catch(console.error);
    } catch (error) {
      console.error("Failed to fetch inventory movement", error);
      alert(t("common.error", "Failed to fetch data"));
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: keyof InventoryMovement) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const toggleRow = (productId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.productName.toLowerCase().includes(term) ||
          (item.productCategory &&
            item.productCategory.toLowerCase().includes(term)),
      );
    }

    // Zero balance filter - User specifically requested to ALWAYS show all products, including zeros
    // (We intentionally don't filter out 0 balances based on the user requirement).

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Handle numeric sorting for balances
      if (typeof valA === "string" && !isNaN(Number(valA))) valA = Number(valA);
      if (typeof valB === "string" && !isNaN(Number(valB))) valB = Number(valB);

      if (valA === valB) return 0;
      if (valA == null) return sortOrder === "asc" ? 1 : -1;
      if (valB == null) return sortOrder === "asc" ? -1 : 1;

      return valA < valB
        ? sortOrder === "asc"
          ? -1
          : 1
        : sortOrder === "asc"
          ? 1
          : -1;
    });

    return result;
  }, [data, searchTerm, sortField, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Header Container matching Realizations Style */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center bg-white p-4 shadow rounded-lg sticky top-0 z-10 dark:bg-gray-800 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center whitespace-nowrap">
          <FileText className="mr-3 shrink-0" />
          Відомість по товарах
        </h1>

        <div className="flex flex-col lg:flex-row gap-4 w-full xl:w-auto items-stretch lg:items-center">
          {/* Warehouse Selector */}
          <div className="w-full lg:w-48">
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-[42px] rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 p-2"
            >
              <option value="" disabled>
                Оберіть склад
              </option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("common.search", "Search...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white h-[42px]"
            />
          </div>

          {/* Date Filters */}
          <div className="flex gap-2 items-center w-full lg:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px] flex-1"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px] flex-1"
            />
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !warehouseId}
            className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors h-[42px] disabled:bg-blue-400 w-full lg:w-auto whitespace-nowrap"
          >
            {loading ? t("common.loading", "Loading...") : "Зформувати"}
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort("productName")}
              >
                <div className="flex items-center gap-1 ml-6">
                  Назва товару
                  {sortField === "productName" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    ))}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort("startBalance")}
              >
                <div className="flex items-center justify-end gap-1">
                  На початку періоду
                  {sortField === "startBalance" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    ))}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort("incoming")}
              >
                <div className="flex items-center justify-end gap-1">
                  Прихід
                  {sortField === "incoming" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    ))}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort("outgoing")}
              >
                <div className="flex items-center justify-end gap-1">
                  Розхід
                  {sortField === "outgoing" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    ))}
                </div>
              </th>
              <th
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => handleSort("endBalance")}
              >
                <div className="flex items-center justify-end gap-1">
                  На кінець періоду
                  {sortField === "endBalance" &&
                    (sortOrder === "asc" ? (
                      <ArrowUp size={14} />
                    ) : (
                      <ArrowDown size={14} />
                    ))}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedData.map((row) => {
              const isExpanded = expandedRows.has(row.productId);
              const hasDetails = row.details && row.details.length > 0;

              return (
                <Fragment key={row.productId}>
                  <tr
                    className={`hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${hasDetails ? "cursor-pointer" : ""}`}
                    onClick={() => hasDetails && toggleRow(row.productId)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200 font-medium truncate max-w-xs xl:max-w-md">
                      <div className="flex items-center">
                        {hasDetails ? (
                          isExpanded ? (
                            <ChevronDown className="h-4 w-4 mr-2 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2 text-gray-500" />
                          )
                        ) : (
                          <div className="w-6" /> // Placeholder spacing
                        )}
                        {row.productName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 text-right">
                      {Number(row.startBalance).toFixed(3)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-right">
                      {Number(row.incoming) > 0
                        ? `+${Number(row.incoming).toFixed(3)}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 dark:text-red-400 text-right">
                      {Number(row.outgoing) > 0
                        ? `-${Number(row.outgoing).toFixed(3)}`
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white text-right">
                      {Number(row.endBalance).toFixed(3)}
                    </td>
                  </tr>

                  {/* Expanded Details Sub-rows */}
                  {isExpanded &&
                    hasDetails &&
                    row.details.map((detail, idx) => {
                      const dt = new Date(detail.date);
                      const dtStr =
                        dt.toLocaleDateString("uk-UA") +
                        " " +
                        dt.toLocaleTimeString("uk-UA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                      return (
                        <tr
                          key={`${row.productId}-detail-${idx}`}
                          className="bg-gray-50 dark:bg-gray-700/50"
                        >
                          <td className="px-6 py-2 whitespace-nowrap text-sm pl-16">
                            {detail.type === "GOODS_RECEIPT" && (
                              <Link
                                to={`/receipts/edit/${detail.id}`}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Надходження №{detail.docNumber} від {dtStr}
                              </Link>
                            )}
                            {detail.type === "REALIZATION" && (
                              <Link
                                to={`/realizations/${detail.id}`}
                                className="text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                Реалізація №{detail.docNumber} від {dtStr}
                              </Link>
                            )}
                          </td>
                          <td className="px-6 py-2 text-right"></td>{" "}
                          {/* Empty Start Balance col */}
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-green-600 dark:text-green-400 text-right">
                            {detail.type === "GOODS_RECEIPT"
                              ? `+${Number(detail.quantity).toFixed(3)}`
                              : ""}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-red-600 dark:text-red-400 text-right">
                            {detail.type === "REALIZATION"
                              ? `-${Number(detail.quantity).toFixed(3)}`
                              : ""}
                          </td>
                          <td className="px-6 py-2 text-right"></td>{" "}
                          {/* Empty End Balance col */}
                        </tr>
                      );
                    })}
                </Fragment>
              );
            })}
            {filteredAndSortedData.length === 0 && !loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Дані відсутні або розширений пошук не дав результатів
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Завантаження даних...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
