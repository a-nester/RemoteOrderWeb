import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Eye,
  FileText,
  ArrowDown,
  ArrowUp,
  Search,
  X,
} from "lucide-react";
import { RealizationService } from "../../services/realization.service";
import type { Realization } from "../../types/realization";
import DocumentActionsDropdown from "../../components/DocumentActionsDropdown";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";

export default function RealizationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const [realizations, setRealizations] = useState<Realization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(
    () => sessionStorage.getItem("realizations_search") || "",
  );
  const [filterCounterparty, setFilterCounterparty] = useState(
    () => sessionStorage.getItem("realizations_counterparty") || "",
  );

  const { user, setPreferences } = useAuthStore();
  const defaultSort = user?.preferences?.realizationSort || "desc";
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSort);

  const toggleSort = async () => {
    const newSort = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newSort);

    // Save to server
    const newPrefs = { ...user?.preferences, realizationSort: newSort };
    setPreferences(newPrefs);
    await AuthService.updatePreferences(newPrefs);
  };

  const getPresetDateRange = (preset: string): { start: string; end: string } | null => {
    const now = new Date();
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    if (preset === "today") {
      const todayStr = formatDate(now);
      return { start: todayStr, end: todayStr };
    }
    if (preset === "week") {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + diffToMonday);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return { start: formatDate(monday), end: formatDate(sunday) };
    }
    if (preset === "month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) };
    }
    if (preset === "all") {
      return { start: "", end: "" };
    }
    return null;
  };

  // Status and Date filters with persistence
  const [statusFilter, setStatusFilter] = useState<string>(() => {
    return localStorage.getItem("realization_status_filter") || "ALL";
  });

  const [datePreset, setDatePreset] = useState<string>(() => {
    return localStorage.getItem("realization_date_preset") || "month";
  });

  const [startDate, setStartDate] = useState(() => {
    const saved = localStorage.getItem("realization_startDate");
    if (saved !== null) return saved;
    const initialPreset = localStorage.getItem("realization_date_preset") || "month";
    const range = getPresetDateRange(initialPreset);
    return range ? range.start : "";
  });

  const [endDate, setEndDate] = useState(() => {
    const saved = localStorage.getItem("realization_endDate");
    if (saved !== null) return saved;
    const initialPreset = localStorage.getItem("realization_date_preset") || "month";
    const range = getPresetDateRange(initialPreset);
    return range ? range.end : "";
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
  }, [highlightId, realizations]);

  useEffect(() => {
    localStorage.setItem("realization_status_filter", statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem("realization_date_preset", datePreset);
    localStorage.setItem("realization_startDate", startDate);
    localStorage.setItem("realization_endDate", endDate);
  }, [datePreset, startDate, endDate]);

  useEffect(() => {
    sessionStorage.setItem("realizations_search", searchTerm);
    sessionStorage.setItem("realizations_counterparty", filterCounterparty);
  }, [searchTerm, filterCounterparty]);

  const handleApplyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const range = getPresetDateRange(preset);
    if (range) {
      setStartDate(range.start);
      setEndDate(range.end);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await RealizationService.getAll();
      setRealizations(data);
    } catch (error) {
      console.error("Failed to load realizations", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, status: string) => {
    if (status === "POSTED") {
      alert(t("common.error", "Cannot delete a posted realization"));
      return;
    }
    if (
      !window.confirm(
        t(
          "common.confirmDelete",
          "Are you sure you want to delete this realization?",
        ),
      )
    )
      return;

    try {
      await RealizationService.deleteRealization(id);
      loadData();
    } catch (error) {
      console.error(error);
      alert(t("common.error", "Failed to delete"));
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === "POSTED") {
        await RealizationService.unpostRealization(id);
      } else {
        await RealizationService.postRealization(id);
      }
      loadData();
    } catch (error: any) {
      console.error("Error toggling status", error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || t("common.error", "Failed to change status");
      alert(errorMessage);
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

  const filteredAndSortedRealizations = useMemo(() => {
    return [...realizations]
      .filter((a) => {
        if (statusFilter && statusFilter !== "ALL" && a.status !== statusFilter) {
          return false;
        }
        if (
          searchTerm &&
          !a.number.toString().includes(searchTerm) &&
          !a.counterpartyName?.toLowerCase().includes(searchTerm.toLowerCase())
        ) {
          return false;
        }
        if (filterCounterparty && a.counterpartyName !== filterCounterparty) {
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
  }, [
    realizations,
    statusFilter,
    searchTerm,
    startDate,
    endDate,
    sortOrder,
    filterCounterparty,
  ]);

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 shadow rounded-lg sticky top-0 z-10 dark:bg-gray-800 space-y-3">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <h1 className="flex text-2xl font-bold text-gray-900 dark:text-white items-center">
            <FileText className="mr-3" />
            {t("menu.realizations", "Realizations")}
          </h1>

          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px] text-sm font-medium"
            >
              <option value="ALL">Всі статуси</option>
              <option value="DRAFT">Чернетка</option>
              <option value="POSTED">Проведено</option>
              <option value="CANCELED">Скасовано</option>
            </select>

            {/* Quick Date Presets */}
            <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden h-[42px]">
              <button
                type="button"
                onClick={() => handleApplyDatePreset("today")}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                  datePreset === "today"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                Сьогодні
              </button>
              <button
                type="button"
                onClick={() => handleApplyDatePreset("week")}
                className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  datePreset === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                Тиждень
              </button>
              <button
                type="button"
                onClick={() => handleApplyDatePreset("month")}
                className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  datePreset === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                Поточний місяць
              </button>
              <button
                type="button"
                onClick={() => handleApplyDatePreset("all")}
                className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                  datePreset === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                Всі
              </button>
            </div>

            {/* Date Inputs */}
            <div className="flex gap-1 items-center">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px] text-xs"
              />
              <span className="text-gray-500 text-xs">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset("custom");
                }}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px] text-xs"
              />
            </div>
          </div>
        </div>

        {/* Second Row: Search, Counterparty Tag, Create Button */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          {filterCounterparty && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800">
              <span className="truncate max-w-[180px]">{filterCounterparty}</span>
              <button
                onClick={() => setFilterCounterparty("")}
                className="hover:text-blue-900 dark:hover:text-blue-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t("common.search", "Search...")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm dark:bg-gray-700 dark:text-white h-[42px]"
            />
          </div>

          <button
            onClick={() => navigate("/realizations/create")}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors h-[42px] text-sm font-semibold whitespace-nowrap w-full sm:w-auto"
          >
            <Plus className="mr-2" size={18} />
            {t("action.create", "Create")}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow hidden md:block rounded-lg">
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
                {t("menu.counterparties", "Counterparty")}
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
            {filteredAndSortedRealizations.map((item: Realization) => {
              const isHighlighted = item.id === highlightId;
              return (
                <tr
                  id={`row-${item.id}`}
                  key={item.id}
                  onClick={() => navigate(`/realizations/${item.id}`)}
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
                    {item.counterpartyName || "-"}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}
                    >
                      {t(`status.${item.status}`, item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {Number(item.amount).toFixed(2)} {item.currency}
                  </td>
                  <td className="px-6 py-1 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3 items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/realizations/${item.id}`);
                        }}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-2"
                      >
                        <Eye size={18} />
                      </button>

                      <DocumentActionsDropdown
                        isPosted={item.status === "POSTED"}
                        paymentUrl={`/finance/transactions?action=payment&counterpartyId=${item.counterpartyId || ""}&amount=${item.amount}`}
                        copyUrl={`/realizations/create?copyFrom=${item.id}`}
                        onToggleStatus={() =>
                          handleToggleStatus(item.id, item.status)
                        }
                        onDelete={() => handleDelete(item.id, item.status)}
                        onBuyerReturn={() =>
                          navigate(
                            `/buyer-returns/create?fromRealization=${item.id}`,
                          )
                        }
                        onFilter={
                          item.counterpartyName
                            ? () =>
                                setFilterCounterparty(item.counterpartyName!)
                            : undefined
                        }
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredAndSortedRealizations.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  {t("common.noData", "No realizations found")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-1">
        {filteredAndSortedRealizations.map((item: Realization) => (
          <div
            key={item.id}
            onClick={() => navigate(`/realizations/${item.id}`)}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-2 space-y-1 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              {/* <div> */}
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {new Date(item.date).toLocaleDateString()}
              </p>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                #{item.number}
              </span>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(item.status)}`}
              >
                {item.status}
              </span>
              {/* </div> */}
            </div>
            <div className="pl-2 text-md text-gray-900 dark:text-white">
              {item.counterpartyName}
            </div>
            <div className="flex justify-between items-center pt-1 border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">
                {Number(item.amount).toFixed(2)} {item.currency}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/realizations/${item.id}`);
                  }}
                  className="p-2 text-indigo-600 dark:text-indigo-400"
                >
                  <Eye size={20} />
                </button>
                <DocumentActionsDropdown
                  isPosted={item.status === "POSTED"}
                  paymentUrl={`/finance/transactions?action=payment&counterpartyId=${item.counterpartyId || ""}&amount=${item.amount}`}
                  copyUrl={`/realizations/create?copyFrom=${item.id}`}
                  onToggleStatus={() =>
                    handleToggleStatus(item.id, item.status)
                  }
                  onDelete={() => handleDelete(item.id, item.status)}
                  onBuyerReturn={() =>
                    navigate(`/buyer-returns/create?fromRealization=${item.id}`)
                  }
                  onFilter={
                    item.counterpartyName
                      ? () => setFilterCounterparty(item.counterpartyName!)
                      : undefined
                  }
                />
              </div>
            </div>
          </div>
        ))}

        {filteredAndSortedRealizations.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t("common.noData", "No realizations found")}
          </div>
        )}
      </div>
    </div>
  );
}
