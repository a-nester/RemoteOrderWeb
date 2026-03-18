import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Eye,
  Trash2,
  FileText,
  ArrowDown,
  ArrowUp,
  Search,
} from "lucide-react";
import { supplierReturnService as SupplierReturnService, type SupplierReturn } from "../../services/supplierReturnService";
import DocumentActionsDropdown from "../../components/DocumentActionsDropdown";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";

export default function SupplierReturnList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const { user, setPreferences } = useAuthStore();
  const defaultSort = user?.preferences?.supplierReturnSort || "desc";
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSort);

  const toggleSort = async () => {
    const newSort = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newSort);

    // Save to server
    const newPrefs = { ...user?.preferences, supplierReturnSort: newSort };
    setPreferences(newPrefs);
    await AuthService.updatePreferences(newPrefs);
  };

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    return localStorage.getItem("supplier_return_startDate") || "";
  });
  const [endDate, setEndDate] = useState(() => {
    const saved = localStorage.getItem("supplier_return_endDate");
    if (saved) return saved;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0)
      .toISOString()
      .split("T")[0];
  });

  const [highlightId, setHighlightId] = useState<string | null>(
    location.state?.highlight || null,
  );

  useEffect(() => {
    if (highlightId) {
      setTimeout(() => {
        const el = document.getElementById(`row-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 300);

      const timer = setTimeout(() => {
        setHighlightId(null);
        window.history.replaceState({}, document.title);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightId, supplierReturns]);

  useEffect(() => {
    localStorage.setItem("supplier_return_startDate", startDate);
    localStorage.setItem("supplier_return_endDate", endDate);
  }, [startDate, endDate]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await SupplierReturnService.getAll();
      setSupplierReturns(data);
    } catch (error) {
      console.error("Failed to load supplier returns", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, status: string) => {
    if (status === "POSTED") {
      alert(t("common.error", "Cannot delete a posted return"));
      return;
    }
    if (
      !window.confirm(
        t(
          "common.confirmDelete",
          "Are you sure you want to delete this return?",
        ),
      )
    )
      return;

    try {
      await SupplierReturnService.delete(id);
      loadData();
    } catch (error) {
      console.error(error);
      alert(t("common.error", "Failed to delete"));
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === "POSTED") {
        await SupplierReturnService.unpostDocument(id);
      } else {
        await SupplierReturnService.postDocument(id);
      }
      loadData();
    } catch (error) {
      console.error("Error toggling status", error);
      alert(t("common.error", "Failed to change status"));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "POSTED":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "CANCELED":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const filteredAndSortedSupplierReturns = useMemo(() => {
    return [...supplierReturns]
      .filter((a) => {
        if (
          searchTerm &&
          !a.number.toString().includes(searchTerm) &&
          !a.supplierName?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        const date = a.date.split("T")[0];
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
  }, [supplierReturns, searchTerm, startDate, endDate, sortOrder]);

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 shadow rounded-lg sticky top-0 z-10 dark:bg-gray-800 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <FileText className="mr-3" />
          Повернення постачальнику
        </h1>

        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 md:w-64">
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
          <div className="flex gap-2 items-center">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px]"
            />
            <span className="text-gray-500">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px]"
            />
          </div>

          <button
            onClick={() => navigate("/supplier-returns/create")}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors h-[42px]"
          >
            <Plus className="mr-2" size={18} />
            {t("action.create", "Create")}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow hidden md:block rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.number", "Number")}
              </th>
              <th
                className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={toggleSort}
              >
                <div className="flex items-center gap-1">
                  {t("common.date", "Date")}
                  {sortOrder === "asc" ? (
                    <ArrowDown size={14} />
                  ) : (
                    <ArrowUp size={14} />
                  )}
                </div>
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("menu.supplier", "Постачальник")}
              </th>
              <th className="px-6 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.status", "Status")}
              </th>
              <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.amount", "Amount")}
              </th>
              <th className="px-6 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAndSortedSupplierReturns.map((item: SupplierReturn) => {
              const isHighlighted = item.id === highlightId;
              return (
                <tr
                  id={`row-${item.id}`}
                  key={item.id}
                  onClick={() => navigate(`/supplier-returns/${item.id}`)}
                  className={`cursor-pointer ${
                    isHighlighted
                      ? "bg-green-100 dark:bg-green-900/40 transition-colors duration-1000"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  }`}
                >
                  <td className="px-6 py-1 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {item.number}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.supplierName || "-"}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}
                    >
                      {t(`status.${item.status}`, item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {Number(item.totalAmount).toFixed(2)} ₴
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/supplier-returns/${item.id}`);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-2"
                      >
                        <Eye size={18} />
                      </button>

                      <DocumentActionsDropdown
                        isPosted={item.status === "POSTED"}
                        paymentUrl={`/finance/transactions?action=payment&counterpartyId=${item.supplierId || ""}&amount=${item.totalAmount}`}
                        copyUrl={`/supplier-returns/create?copyFrom=${item.id}`}
                        onToggleStatus={() =>
                          handleToggleStatus(item.id, item.status)
                        }
                        onDelete={() => handleDelete(item.id, item.status)}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredAndSortedSupplierReturns.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {t("common.noData", "No returns found")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-4 px-4">
        {filteredAndSortedSupplierReturns.map((item: SupplierReturn) => (
          <div
            key={item.id}
            onClick={() => navigate(`/supplier-returns/${item.id}`)}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 space-y-1 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  #{item.number}
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(item.date).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(item.status)}`}
              >
                {t(`status.${item.status}`, item.status)}
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {item.supplierName}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">
                {Number(item.totalAmount).toFixed(2)} ₴
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/supplier-returns/${item.id}`);
                  }}
                  className="p-2 text-indigo-600 dark:text-indigo-400"
                >
                  <Eye size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(item.id, item.status);
                  }}
                  disabled={item.status === "POSTED"}
                  className={
                    item.status === "POSTED"
                      ? "p-2 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      : "p-2 text-red-600 dark:text-red-400"
                  }
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {filteredAndSortedSupplierReturns.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t("common.noData", "No returns found")}
          </div>
        )}
      </div>
    </div>
  );
}
