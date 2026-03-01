import { useState, useEffect } from "react";
import { RealizationService } from "../../services/realization.service";
import {
  ReportsService,
  type SalesByClient,
  type SalesByProduct,
} from "../../services/reports.service";
import { useTranslation } from "react-i18next";

interface SaleItem {
  id: string;
  number: string;
  date: string;
  counterpartyName?: string;
  warehouseName: string;
  amount: number;
  currency: string;
  status: string;
  profit: number;
}

type TabType = "general" | "byClient" | "byProduct";

export default function SalesReport() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [salesByClient, setSalesByClient] = useState<SalesByClient[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [counterparty, setCounterparty] = useState<string>("");

  const fetchSales = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === "general") {
        let data = await RealizationService.getAll();

        if (dateFrom)
          data = data.filter((d) => new Date(d.date) >= new Date(dateFrom));
        if (dateTo)
          data = data.filter((d) => new Date(d.date) <= new Date(dateTo));
        if (counterparty)
          data = data.filter((d) =>
            (d.counterpartyName ?? "")
              .toLowerCase()
              .includes(counterparty.toLowerCase()),
          );

        const mapped: SaleItem[] = data.map((r) => ({
          id: r.id,
          number: r.number,
          date: r.date,
          counterpartyName: r.counterpartyName ?? "",
          warehouseName: r.warehouseName ?? "",
          amount: Number(r.amount),
          currency: r.currency,
          status: r.status,
          profit: Number(r.profit ?? 0),
        }));
        setSales(mapped);
      } else if (activeTab === "byClient") {
        const data = await ReportsService.getSalesByClient(
          dateFrom,
          dateTo,
          counterparty,
        );
        setSalesByClient(data);
      } else if (activeTab === "byProduct") {
        const data = await ReportsService.getSalesByProduct(
          dateFrom,
          dateTo,
          counterparty,
        );
        setSalesByProduct(data);
      }
    } catch (err: any) {
      console.error(err);
      setError(t("common.error", "Failed to load sales"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const formatNum = (num: any) => Number(num || 0).toFixed(2);

  return (
    <div className="p-4 max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        {t("menu.salesReport", "Звіт по продажам")}
      </h1>

      {/* Фільтри */}
      <div className="flex gap-4 mb-4 flex-wrap items-end border-b pb-4 border-gray-200 shadow-sm rounded-lg p-4 bg-white">
        <div>
          <label className="block text-sm mb-1 text-gray-600 font-medium">
            {t("common.dateFrom", "Date From")}
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-gray-600 font-medium">
            {t("common.dateTo", "Date To")}
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm mb-1 text-gray-600 font-medium">
            {t("common.customer", "Customer")}
          </label>
          <input
            type="text"
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
            placeholder={t("common.customer", "Customer")}
            className="border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[250px]"
          />
        </div>
        <button
          onClick={fetchSales}
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-1.5 rounded-md font-medium shadow-sm"
        >
          {t("common.filter", "Filter")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-6">
        <button
          className={`pb-3 px-2 transition-all duration-200 border-b-2 ${activeTab === "general" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}
          onClick={() => setActiveTab("general")}
        >
          {t("reports.generalList", "Загальний список")}
        </button>
        <button
          className={`pb-3 px-2 transition-all duration-200 border-b-2 ${activeTab === "byClient" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}
          onClick={() => setActiveTab("byClient")}
        >
          {t("reports.byClient", "По клієнтам")}
        </button>
        <button
          className={`pb-3 px-2 transition-all duration-200 border-b-2 ${activeTab === "byProduct" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}
          onClick={() => setActiveTab("byProduct")}
        >
          {t("reports.byProduct", "По товарам")}
        </button>
      </div>

      {loading && (
        <div className="py-8 text-center text-gray-500 animate-pulse">
          {t("common.loading", "Loading...")}
        </div>
      )}
      {error && (
        <div className="text-red-500 py-4 font-medium bg-red-50 px-4 rounded-md">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden">
          {activeTab === "general" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.number", "Number")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.date", "Date")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.customer", "Customer")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.warehouse", "Warehouse")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.amount", "Amount")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.profit", "Profit")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.status", "Status")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((sale, index) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {sale.number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(sale.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {sale.counterpartyName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {sale.warehouseName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {sale.amount.toFixed(2)} {sale.currency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-green-600 text-right">
                        {sale.profit?.toFixed(2) || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${sale.status === "POSTED" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                        >
                          {sale.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        {t("common.noData", "Немає даних")}
                      </td>
                    </tr>
                  )}
                </tbody>
                {sales.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-3 text-right text-sm font-bold text-gray-700"
                      >
                        {t("common.total", "Всього")}:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {sales
                          .reduce((sum, item) => sum + item.amount, 0)
                          .toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                        {sales
                          .reduce((sum, item) => sum + item.profit, 0)
                          .toFixed(2)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {activeTab === "byClient" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.customer", "Клієнт")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reports.documentsCount", "К-сть документів")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.amount", "Сума продажів")} (₴)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.profit", "Прибуток")} (₴)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesByClient.map((row, index) => (
                    <tr
                      key={row.clientId || index}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.clientName || t("common.unknown", "Unknown")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                        {row.documentsCount}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                        {formatNum(row.totalAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        {formatNum(row.totalProfit)}
                      </td>
                    </tr>
                  ))}
                  {salesByClient.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500">
                        {t("common.noData", "Немає даних")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "byProduct" && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.category", "Категорія")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.product", "Товар")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.quantity", "Кількість")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.amount", "Сума")} (₴)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.profit", "Прибуток")} (₴)
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesByProduct.map((row, index) => (
                    <tr
                      key={row.productId}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {row.productCategory || "-"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.productName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatNum(row.totalQuantity)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                        {formatNum(row.totalAmount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        {formatNum(row.totalProfit)}
                      </td>
                    </tr>
                  ))}
                  {salesByProduct.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        {t("common.noData", "Немає даних")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
