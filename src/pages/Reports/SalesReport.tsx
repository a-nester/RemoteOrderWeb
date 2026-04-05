import { useState, useEffect, Fragment } from "react";
import { RealizationService } from "../../services/realization.service";
import {
  ReportsService,
  type SalesByClient,
  type SalesByProduct,
} from "../../services/reports.service";
import { buyerReturnService } from "../../services/buyerReturnService";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";
import { OrganizationService } from "../../services/organization.service";
import * as XLSX from "xlsx";
import { Download, Printer } from "lucide-react";
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
  salesType?: string;
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

  const { user, setPreferences } = useAuthStore();

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(() => user?.preferences?.salesDateFrom || "");
  const [dateTo, setDateTo] = useState<string>(() => {
    if (user?.preferences?.salesDateTo) return user?.preferences?.salesDateTo;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
  });
  const [counterparty, setCounterparty] = useState<string>("");
  const [groupBySalesType, setGroupBySalesType] = useState<boolean>(false);
  const [salesType, setSalesType] = useState<string>("");
  const [salesTypesList, setSalesTypesList] = useState<string[]>([]);

  useEffect(() => {
    OrganizationService.getOrganization()
      .then((orgs) => {
        const org = Array.isArray(orgs) ? orgs[0] : orgs;
        if (org && org.salesTypes) {
          setSalesTypesList(org.salesTypes);
        }
      })
      .catch((err) => console.error("Failed to load sales types", err));
  }, []);

  const fetchSales = async () => {
    setLoading(true);
    setError(null);

    // Зберігаємо налаштування дат на сервері
    if (user) {
      const newPrefs = { ...user.preferences, salesDateFrom: dateFrom, salesDateTo: dateTo };
      setPreferences(newPrefs);
      AuthService.updatePreferences(newPrefs).catch(console.error);
    }

    try {
      if (activeTab === "general") {
        const [realizations, returns] = await Promise.all([
          RealizationService.getAll(),
          buyerReturnService.getAll()
        ]);

        let combined = [
          ...realizations.map(r => ({ ...r, type: 'REALIZATION' as const })),
          ...returns.map(r => ({ ...r, type: 'RETURN' as const, amount: r.totalAmount, currency: 'UAH' }))
        ];

        if (dateFrom)
          combined = combined.filter((d) => new Date(d.date) >= new Date(dateFrom));
        if (dateTo)
          combined = combined.filter((d) => new Date(d.date) <= new Date(dateTo));
        if (counterparty)
          combined = combined.filter((d) =>
            (d.counterpartyName ?? "")
              .toLowerCase()
              .includes(counterparty.toLowerCase()),
          );
        if (salesType)
          combined = combined.filter(
            (d) => d.type === "REALIZATION" && (d as any).salesType === salesType
          );

        // Sort by date DESC
        combined.sort((a, b) => {
          if (groupBySalesType) {
            const stA = (a as any).salesType || "";
            const stB = (b as any).salesType || "";
            if (stA !== stB) {
              if (!stA) return 1;
              if (!stB) return -1;
              return stA.localeCompare(stB);
            }
          }
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        });

        const mapped: SaleItem[] = combined.map((r) => {
          const isReturn = r.type === 'RETURN';
          const sign = isReturn && r.status === 'POSTED' ? -1 : 1;
          return {
            id: r.id,
            number: isReturn ? `Пов. #${r.number}` : r.number,
            date: r.date,
            counterpartyName: r.counterpartyName ?? "",
            warehouseName: r.warehouseName ?? "",
            amount: Number(r.amount) * sign,
            currency: r.currency,
            status: r.status,
            profit: Number(r.profit ?? 0), // Profit is already net-changed in DB
            salesType: (r as any).salesType || "-",
          };
        });
        setSales(mapped);
      } else if (activeTab === "byClient") {
        const data = await ReportsService.getSalesByClient(
          dateFrom,
          dateTo,
          counterparty,
          groupBySalesType,
          salesType
        );
        setSalesByClient(data);
      } else if (activeTab === "byProduct") {
        const data = await ReportsService.getSalesByProduct(
          dateFrom,
          dateTo,
          counterparty,
          groupBySalesType,
          salesType
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

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = () => {
    if (sales.length === 0 && activeTab === "general") return;

    let excelData: any[] = [];
    let sheetName = "Звіт_По_Продажам";

    if (activeTab === "general") {
      excelData = sales.map((row) => ({
        "Номер": row.number,
        "Дата": new Date(row.date).toLocaleString('uk-UA'),
        "Клієнт": row.counterpartyName,
        "Склад": row.warehouseName,
        "Вид продажу": row.salesType,
        "Статус": row.status === "POSTED" ? "Проведено" : "Збережено",
        "Сума": Number(row.amount),
        "Валюта": row.currency,
        "Прибуток": Number(row.profit)
      }));
    } else if (activeTab === "byClient") {
      excelData = salesByClient.map(row => ({
        "Клієнт": row.clientName,
        "К-ть Документів": Number(row.documentsCount),
        "Вид продажу": row.salesType || "-",
        "Сума Продажу": Number(row.totalAmount),
        "Прибуток": Number(row.totalProfit)
      }));
      sheetName = "По_Клієнтам";
    } else if (activeTab === "byProduct") {
      excelData = salesByProduct.map(row => ({
        "Товар": row.productName,
        "Категорія": row.productCategory || "Без категорії",
        "Вид продажу": row.salesType || "-",
        "К-ть": Number(row.totalQuantity),
        "Сума Продажу": Number(row.totalAmount),
        "Закупівельна вартість": Number(row.totalPurchaseCost),
        "Прибуток": Number(row.totalProfit)
      }));
      sheetName = "По_Товарам";
    }

    if (excelData.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = `Продажі_${sheetName}_${dateFrom || 'start'}_${dateTo || 'end'}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto print:p-0 print:max-w-none">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {t("menu.salesReport", "Звіт по продажам")}
        </h1>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm font-medium"
          >
            <Printer size={18} className="mr-2" />
            {t("action.print", "Друк / PDF")}
          </button>
          <button
            onClick={exportToExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm font-medium"
          >
            <Download size={18} className="mr-2" />
            Експорт Excel
          </button>
        </div>
      </div>

      {/* Фільтри */}
      <div className="flex gap-4 mb-4 flex-wrap items-end border-b pb-4 border-gray-200 shadow-sm rounded-lg p-4 bg-white print:hidden">
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
        <div>
          <label className="block text-sm mb-1 text-gray-600 font-medium">
            {t("reports.salesType", "Вид продажу")}
          </label>
          <select
            value={salesType}
            onChange={(e) => setSalesType(e.target.value)}
            className="border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[150px]"
          >
            <option value="">{t("reports.allSalesTypes", "Всі види")}</option>
            {salesTypesList.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center mb-2 mr-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={groupBySalesType}
              onChange={(e) => setGroupBySalesType(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              {t("reports.groupBySalesType", "Сортувати за типом продаж")}
            </span>
          </label>
        </div>
        <button
          onClick={fetchSales}
          className="bg-blue-600 hover:bg-blue-700 transition-colors text-white px-6 py-1.5 rounded-md font-medium shadow-sm mb-1"
        >
          {t("common.filter", "Filter")}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 mb-6 print:hidden">
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
                      {t("reports.salesType", "Вид")}
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.profitability", "Рент, %")}
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
                        {sale.salesType}
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                        {sale.amount !== 0 ? ((sale.profit / sale.amount) * 100).toFixed(2) + " %" : "-"}
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
                        colSpan={6}
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
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {(() => {
                           const totalAmt = sales.reduce((sum, item) => sum + item.amount, 0);
                           const totalPrf = sales.reduce((sum, item) => sum + item.profit, 0);
                           return totalAmt !== 0 ? ((totalPrf / totalAmt) * 100).toFixed(2) + " %" : "-";
                        })()}
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
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.profitability", "Рент, %")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupBySalesType ? (
                    Object.entries(
                      salesByClient.reduce((acc, row) => {
                        const st = row.salesType || "Не визначено";
                        if (!acc[st]) acc[st] = [];
                        acc[st].push(row);
                        return acc;
                      }, {} as Record<string, SalesByClient[]>)
                    ).map(([salesType, rows]) => (
                      <Fragment key={salesType}>
                        <tr className="bg-blue-50/50">
                          <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900 border-y border-gray-200">
                            {salesType}
                          </td>
                        </tr>
                        {rows.map((row, index) => (
                           <tr
                             key={row.clientId || index}
                             className="hover:bg-gray-50 transition-colors"
                           >
                             <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                               {index + 1}
                             </td>
                             <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 pl-8">
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
                             <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                               {Number(row.totalAmount) !== 0 ? ((Number(row.totalProfit) / Number(row.totalAmount)) * 100).toFixed(2) + " %" : "-"}
                             </td>
                           </tr>
                        ))}
                        <tr className="bg-gray-50 border-t border-gray-200">
                           <td colSpan={3} className="px-4 py-2 text-right text-sm font-bold text-gray-700">
                             {t("common.total", "Підсумок")} ({salesType}):
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                             {formatNum(rows.reduce((sum, item) => sum + Number(item.totalAmount), 0))}
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-green-700">
                             {formatNum(rows.reduce((sum, item) => sum + Number(item.totalProfit), 0))}
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                             {(() => {
                               const totalAmt = rows.reduce((sum, item) => sum + Number(item.totalAmount), 0);
                               const totalPrf = rows.reduce((sum, item) => sum + Number(item.totalProfit), 0);
                               return totalAmt !== 0 ? ((totalPrf / totalAmt) * 100).toFixed(2) + " %" : "-";
                             })()}
                           </td>
                        </tr>
                      </Fragment>
                    ))
                  ) : (
                    salesByClient.map((row, index) => (
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
                    ))
                  )}
                  {salesByClient.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500">
                        {t("common.noData", "Немає даних")}
                      </td>
                    </tr>
                  )}
                </tbody>
                {salesByClient.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-right text-sm font-bold text-gray-700"
                      >
                        {t("common.total", "Всього")}:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {formatNum(
                          salesByClient.reduce(
                            (sum, item) => sum + Number(item.totalAmount),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                        {formatNum(
                          salesByClient.reduce(
                            (sum, item) => sum + Number(item.totalProfit),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {(() => {
                           const totalAmt = salesByClient.reduce((sum, item) => sum + Number(item.totalAmount), 0);
                           const totalPrf = salesByClient.reduce((sum, item) => sum + Number(item.totalProfit), 0);
                           return totalAmt !== 0 ? ((totalPrf / totalAmt) * 100).toFixed(2) + " %" : "-";
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                )}
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
                      Закупівельна вартість (₴)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.profit", "Прибуток")} (₴)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.profitability", "Рент, %")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {groupBySalesType ? (
                    Object.entries(
                      salesByProduct.reduce((acc, row) => {
                        const st = row.salesType || "Не визначено";
                        if (!acc[st]) acc[st] = [];
                        acc[st].push(row);
                        return acc;
                      }, {} as Record<string, SalesByProduct[]>)
                    ).map(([salesType, rows]) => (
                      <Fragment key={salesType}>
                        <tr className="bg-blue-50/50">
                          <td colSpan={8} className="px-4 py-3 text-sm font-bold text-gray-900 border-y border-gray-200">
                            {salesType}
                          </td>
                        </tr>
                        {rows.map((row, index) => (
                          <tr
                            key={row.productId}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 pl-8">
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
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-600 text-right">
                              {formatNum(row.totalPurchaseCost)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                              {formatNum(row.totalProfit)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                              {Number(row.totalAmount) !== 0 ? ((Number(row.totalProfit) / Number(row.totalAmount)) * 100).toFixed(2) + " %" : "-"}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-gray-50 border-t border-gray-200">
                           <td colSpan={3} className="px-4 py-2 text-right text-sm font-bold text-gray-700">
                             {t("common.total", "Підсумок")} ({salesType}):
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                             {formatNum(rows.reduce((sum, item) => sum + Number(item.totalQuantity), 0))}
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                             {formatNum(rows.reduce((sum, item) => sum + Number(item.totalAmount), 0))}
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-gray-700">
                             {formatNum(rows.reduce((sum, item) => sum + Number(item.totalPurchaseCost), 0))}
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-green-700">
                             {formatNum(rows.reduce((sum, item) => sum + Number(item.totalProfit), 0))}
                           </td>
                           <td className="px-4 py-2 text-right text-sm font-bold text-gray-900">
                             {(() => {
                               const totalAmt = rows.reduce((sum, item) => sum + Number(item.totalAmount), 0);
                               const totalPrf = rows.reduce((sum, item) => sum + Number(item.totalProfit), 0);
                               return totalAmt !== 0 ? ((totalPrf / totalAmt) * 100).toFixed(2) + " %" : "-";
                             })()}
                           </td>
                        </tr>
                      </Fragment>
                    ))
                  ) : (
                    salesByProduct.map((row, index) => (
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
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-600 text-right">
                          {formatNum(row.totalPurchaseCost)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                          {formatNum(row.totalProfit)}
                        </td>
                      </tr>
                    ))
                  )}
                  {salesByProduct.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-gray-500">
                        {t("common.noData", "Немає даних")}
                      </td>
                    </tr>
                  )}
                </tbody>
                {salesByProduct.length > 0 && (
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-right text-sm font-bold text-gray-700"
                      >
                        {t("common.total", "Всього")}:
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {formatNum(
                          salesByProduct.reduce(
                            (sum, item) => sum + Number(item.totalQuantity),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {formatNum(
                          salesByProduct.reduce(
                            (sum, item) => sum + Number(item.totalAmount),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-700">
                        {formatNum(
                          salesByProduct.reduce(
                            (sum, item) => sum + Number(item.totalPurchaseCost),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-green-700">
                        {formatNum(
                          salesByProduct.reduce(
                            (sum, item) => sum + Number(item.totalProfit),
                            0,
                          ),
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        {(() => {
                           const totalAmt = salesByProduct.reduce((sum, item) => sum + Number(item.totalAmount), 0);
                           const totalPrf = salesByProduct.reduce((sum, item) => sum + Number(item.totalProfit), 0);
                           return totalAmt !== 0 ? ((totalPrf / totalAmt) * 100).toFixed(2) + " %" : "-";
                        })()}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
