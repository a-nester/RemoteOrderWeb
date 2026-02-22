import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Eye, Archive } from "lucide-react";
import { RealizationService } from "../../services/realization.service";
import type { Realization } from "../../types/realization";

export default function RealizationsArchive() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [realizations, setRealizations] = useState<Realization[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch ALL realizations with includeDeleted flag
      const data = await RealizationService.getAll({ includeDeleted: true });

      // Filter down to only deleted ones
      const archived = data.filter((r) => r.isDeleted);
      setRealizations(archived);
    } catch (error) {
      console.error("Failed to load realizations archive", error);
    } finally {
      setLoading(false);
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
          <Archive className="mr-3" />
          Видалені реалізації
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow hidden md:block rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.number", "Number")}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {t("common.date", "Date")}
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
            {realizations.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 opacity-70"
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400 line-through">
                  {item.number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(item.date).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {item.counterpartyName || "-"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(item.status)}`}
                  >
                    {t(`status.${item.status}`, item.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-500 dark:text-gray-400">
                  {Number(item.amount).toFixed(2)} {item.currency}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => navigate(`/realizations/${item.id}`)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {realizations.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  Немає видалених реалізацій
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
            className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 space-y-2 opacity-70"
          >
            <div className="flex justify-between items-start">
              <div className="line-through text-gray-500">
                <span className="text-sm font-bold">#{item.number}</span>
                <p className="text-xs">
                  {new Date(item.date).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(item.status)}`}
              >
                {item.status}
              </span>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {item.counterpartyName}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-500 dark:text-gray-400">
                {Number(item.amount).toFixed(2)} {item.currency}
              </span>
              <button
                onClick={() => navigate(`/realizations/${item.id}`)}
                className="p-2 text-indigo-600 dark:text-indigo-400"
              >
                <Eye size={20} />
              </button>
            </div>
          </div>
        ))}
        {realizations.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            Немає видалених реалізацій
          </div>
        )}
      </div>
    </div>
  );
}
