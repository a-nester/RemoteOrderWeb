import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { FileText, Eye, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { RealizationService } from "../../services/realization.service";
import type { Realization } from "../../types/realization";

export default function RealizationList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [realizations, setRealizations] = useState<Realization[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

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

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4 md:px-0">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <FileText className="mr-3" />
          {t("menu.realizations", "Realizations")}
        </h1>
        {/* 
                // Manual creation is not requested yet, only from Order.
                <button
                    onClick={() => navigate('/realizations/new')}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    <Plus className="mr-2" size={18} />
                    {t('action.create', 'Create')}
                </button> 
                */}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow hidden md:block rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.number", "Number")}
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() =>
                  setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
                }
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("menu.counterparties", "Counterparty")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.status", "Status")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.amount", "Amount")}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.actions", "Actions")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {[...realizations]
              .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
              })
              .map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {item.number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(item.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {item.counterpartyName || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}
                    >
                      {t(`status.${item.status}`, item.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {Number(item.amount).toFixed(2)} {item.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => navigate(`/realizations/${item.id}`)}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.status)}
                        disabled={item.status === "POSTED"}
                        className={
                          item.status === "POSTED"
                            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                            : "text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        }
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            {realizations.length === 0 && (
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
      <div className="md:hidden space-y-4 px-4">
        {realizations.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 space-y-2"
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
                {item.status}
              </span>
            </div>
            <div className="text-sm text-gray-700 dark:text-gray-300">
              {item.counterpartyName}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-900 dark:text-white">
                {Number(item.amount).toFixed(2)} {item.currency}
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/realizations/${item.id}`)}
                  className="p-2 text-indigo-600 dark:text-indigo-400"
                >
                  <Eye size={20} />
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.status)}
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

        {realizations.length === 0 && (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {t("common.noData", "No realizations found")}
          </div>
        )}
      </div>
    </div>
  );
}
