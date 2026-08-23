import { useState, useEffect, useMemo, Fragment } from "react";
import { RealizationService } from "../../services/realization.service";
import {
  ReportsService,
  type SalesByClient,
  type SalesByProduct,
  type SalesByClientDetail,
} from "../../services/reports.service";
import { buyerReturnService } from "../../services/buyerReturnService";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/auth.store";
import { AuthService } from "../../services/auth.service";
import { OrganizationService } from "../../services/organization.service";
import { CounterpartyService } from "../../services/counterparty.service";
import type { Counterparty, CounterpartyGroup } from "../../types/counterparty";
import * as XLSX from "xlsx-js-style";
import { Download, Printer, ChevronDown, ChevronRight, Check } from "lucide-react";

interface SaleItem {
  id: string;
  number: string;
  date: string;
  counterpartyId?: string;
  counterpartyName?: string;
  warehouseName: string;
  amount: number;
  currency: string;
  status: string;
  profit: number;
  salesType?: string;
}

type TabType = "general" | "byClient" | "byProduct";
type GroupMode = "none" | "group" | "group_from_list";

interface MultiSelectDropdownProps<T> {
  items: T[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  getId: (item: T) => string;
  getName: (item: T) => string;
  placeholder: string;
}

function MultiSelectDropdown<T>({
  items,
  selectedIds,
  onChange,
  getId,
  getName,
  placeholder,
}: MultiSelectDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    return items.filter((item) =>
      getName(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm, getName]);

  const toggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredItems.map(getId);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onChange(selectedIds.filter((id) => !visibleIds.includes(id)));
    } else {
      onChange(Array.from(new Set([...selectedIds, ...visibleIds])));
    }
  };

  const displayText = useMemo(() => {
    if (selectedIds.length === 0) return placeholder;
    if (selectedIds.length === 1) {
      const found = items.find((i) => getId(i) === selectedIds[0]);
      return found ? getName(found) : placeholder;
    }
    return `Вибрано (${selectedIds.length})`;
  }, [selectedIds, items, getId, getName, placeholder]);

  return (
    <div className="relative min-w-[220px]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between border border-gray-300 px-3 py-1.5 rounded-md bg-white text-sm text-left focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
      >
        <span className="truncate mr-2 font-medium text-gray-800">
          {displayText}
        </span>
        <ChevronDown size={16} className="text-gray-400 shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown Menu */}
          <div className="absolute left-0 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-2 space-y-2">
            <input
              type="text"
              placeholder="Пошук..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            {filteredItems.length > 0 && (
              <div className="flex justify-between items-center px-1">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  {filteredItems.every((i) => selectedIds.includes(getId(i)))
                    ? "Зняти всі"
                    : "Обрати всіх"}
                </button>
                {selectedIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Очистити
                  </button>
                )}
              </div>
            )}
            <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded">
              {filteredItems.length === 0 ? (
                <div className="p-2 text-xs text-gray-400 text-center">
                  Нічого не знайдено
                </div>
              ) : (
                filteredItems.map((item) => {
                  const id = getId(item);
                  const isChecked = selectedIds.includes(id);
                  return (
                    <label
                      key={id}
                      className="flex items-center px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 cursor-pointer select-none"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleItem(id)}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                      />
                      <span className="truncate">{getName(item)}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Готово
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function SalesReport() {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [salesByClient, setSalesByClient] = useState<SalesByClient[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down states
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({});
  const [clientDetails, setClientDetails] = useState<Record<string, SalesByClientDetail[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});

  const toggleClientDetails = async (clientRow: SalesByClient) => {
    const key = `${clientRow.clientId}_${clientRow.salesType || ''}`;
    const isExpanded = !!expandedClients[key];
    
    setExpandedClients(prev => ({ ...prev, [key]: !isExpanded }));

    if (!isExpanded && !clientDetails[key]) {
        setLoadingDetails(prev => ({ ...prev, [key]: true }));
        try {
            const data = await ReportsService.getSalesByClientDetails(
                clientRow.clientId, dateFrom || undefined, dateTo || undefined, clientRow.salesType
            );
            setClientDetails(prev => ({ ...prev, [key]: data }));
        } catch (e) {
            console.error('Failed to load client details:', e);
        } finally {
            setLoadingDetails(prev => ({ ...prev, [key]: false }));
        }
    }
  };

  const { user, setPreferences } = useAuthStore();

  // Filters
  const [dateFrom, setDateFrom] = useState<string>(() => user?.preferences?.salesDateFrom || "");
  const [dateTo, setDateTo] = useState<string>(() => {
    if (user?.preferences?.salesDateTo) return user?.preferences?.salesDateTo;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
  });
  const [counterparty, setCounterparty] = useState<string>("");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedCounterpartyIds, setSelectedCounterpartyIds] = useState<string[]>([]);

  const [groupsList, setGroupsList] = useState<CounterpartyGroup[]>([]);
  const [counterpartiesList, setCounterpartiesList] = useState<Counterparty[]>([]);

  const [groupBySalesType, setGroupBySalesType] = useState<boolean>(false);
  const [includeReturns, setIncludeReturns] = useState<boolean>(false);
  const [salesType, setSalesType] = useState<string>("");
  const [salesTypesList, setSalesTypesList] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      OrganizationService.getOrganization(),
      CounterpartyService.getGroups(),
      CounterpartyService.getAll(),
    ])
      .then(([orgs, groupsData, cpData]) => {
        const org = Array.isArray(orgs) ? orgs[0] : orgs;
        if (org && org.salesTypes) {
          setSalesTypesList(org.salesTypes);
        }
        setGroupsList(groupsData || []);
        setCounterpartiesList(cpData || []);
      })
      .catch((err) => console.error("Failed to load report dependencies", err));
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

        // Group mode filters for general tab
        if (groupMode === "none") {
          if (counterparty)
            combined = combined.filter((d) =>
              (d.counterpartyName ?? "")
                .toLowerCase()
                .includes(counterparty.toLowerCase())
            );
        } else if (groupMode === "group") {
          if (selectedGroupIds.length > 0) {
            const cpGroupMap = new Map(counterpartiesList.map((cp) => [cp.id, cp.groupId]));
            const cpNameGroupMap = new Map(counterpartiesList.map((cp) => [cp.name.toLowerCase(), cp.groupId]));
            combined = combined.filter((d) => {
              const cpId = (d as any).counterpartyId;
              const gId = cpId ? cpGroupMap.get(cpId) : cpNameGroupMap.get((d.counterpartyName || "").toLowerCase());
              return gId && selectedGroupIds.includes(gId);
            });
          }
        } else if (groupMode === "group_from_list") {
          if (selectedCounterpartyIds.length > 0) {
            const selectedNames = new Set(
              counterpartiesList
                .filter((cp) => selectedCounterpartyIds.includes(cp.id))
                .map((cp) => cp.name.toLowerCase())
            );
            combined = combined.filter((d) => {
              const cpId = (d as any).counterpartyId;
              if (cpId && selectedCounterpartyIds.includes(cpId)) return true;
              return selectedNames.has((d.counterpartyName || "").toLowerCase());
            });
          }
        }

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
            counterpartyId: (r as any).counterpartyId,
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
      } else {
        let filterCounterparty: string | undefined = undefined;
        let filterGroupIds: string | undefined = undefined;
        let filterCounterpartyIds: string | undefined = undefined;

        if (groupMode === "none") {
          filterCounterparty = counterparty || undefined;
        } else if (groupMode === "group") {
          if (selectedGroupIds.length > 0) {
            filterGroupIds = selectedGroupIds.join(",");
          }
        } else if (groupMode === "group_from_list") {
          if (selectedCounterpartyIds.length > 0) {
            filterCounterpartyIds = selectedCounterpartyIds.join(",");
          }
        }

        if (activeTab === "byClient") {
          const data = await ReportsService.getSalesByClient(
            dateFrom,
            dateTo,
            filterCounterparty,
            groupBySalesType,
            salesType,
            includeReturns,
            filterGroupIds,
            filterCounterpartyIds
          );
          setSalesByClient(data);
        } else if (activeTab === "byProduct") {
          const data = await ReportsService.getSalesByProduct(
            dateFrom,
            dateTo,
            filterCounterparty,
            groupBySalesType,
            salesType,
            includeReturns,
            filterGroupIds,
            filterCounterpartyIds
          );
          setSalesByProduct(data);
        }
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
        "Ціна за од. (₴)": Number(row.totalQuantity) !== 0 ? (Number(row.totalAmount) / Number(row.totalQuantity)).toFixed(2) : "0.00",
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

  const renderClientRow = (row: SalesByClient, index: number) => {
    const key = `${row.clientId}_${row.salesType || ''}`;
    const isExpanded = !!expandedClients[key];
    const details = clientDetails[key];
    const isLoading = loadingDetails[key];

    return (
      <Fragment key={key}>
        <tr className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleClientDetails(row)}>
          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
            <div className="flex items-center gap-2">
                <button className="text-gray-400 hover:text-gray-600 focus:outline-none">
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {index + 1}
            </div>
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
          {groupBySalesType && (
            <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
              {Number(row.totalAmount) !== 0 ? ((Number(row.totalProfit) / Number(row.totalAmount)) * 100).toFixed(2) + " %" : "-"}
            </td>
          )}
        </tr>
        {isExpanded && (
            <tr className="bg-gray-50/50">
                <td colSpan={groupBySalesType ? 6 : 5} className="px-8 py-4">
                    {isLoading ? (
                        <div className="text-sm text-gray-500 text-center py-2">Завантаження деталей...</div>
                    ) : details && details.length > 0 ? (
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 shadow-sm rounded-lg overflow-hidden">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Товар</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">К-сть</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Сума</th>
                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Прибуток</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {details.map((d, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{d.productName || "Невідомий товар"}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{Number(d.quantity).toFixed(2)} {d.unit}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{formatNum(d.amount)}</td>
                                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-green-600 text-right">{formatNum(d.profit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-sm text-gray-500 text-center py-2">Немає товарів</div>
                    )}
                </td>
            </tr>
        )}
      </Fragment>
    );
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

        {/* Dynamic Filter Field (Client / Group / Group from list) */}
        {groupMode === "none" && (
          <div>
            <label className="block text-sm mb-1 text-gray-600 font-medium">
              {t("common.customer", "Клієнт")}
            </label>
            <input
              type="text"
              value={counterparty}
              onChange={(e) => setCounterparty(e.target.value)}
              placeholder={t("common.customer", "Клієнт")}
              className="border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
            />
          </div>
        )}

        {groupMode === "group" && (
          <div>
            <label className="block text-sm mb-1 text-gray-600 font-medium">
              Група
            </label>
            <MultiSelectDropdown
              items={groupsList}
              selectedIds={selectedGroupIds}
              onChange={setSelectedGroupIds}
              getId={(g) => g.id}
              getName={(g) => g.name}
              placeholder="Всі групи"
            />
          </div>
        )}

        {groupMode === "group_from_list" && (
          <div>
            <label className="block text-sm mb-1 text-gray-600 font-medium">
              Група зі списку
            </label>
            <MultiSelectDropdown
              items={counterpartiesList}
              selectedIds={selectedCounterpartyIds}
              onChange={setSelectedCounterpartyIds}
              getId={(c) => c.id}
              getName={(c) => c.name}
              placeholder="Всі контрагенти"
            />
          </div>
        )}

        {/* Grouping Select Dropdown (Placed right after Client filter) */}
        <div>
          <label className="block text-sm mb-1 text-gray-600 font-medium">
            Групування
          </label>
          <select
            value={groupMode}
            onChange={(e) => {
              setGroupMode(e.target.value as GroupMode);
              setSelectedGroupIds([]);
              setSelectedCounterpartyIds([]);
            }}
            className="border border-gray-300 px-3 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-[170px]"
          >
            <option value="none">Без групування</option>
            <option value="group">Група</option>
            <option value="group_from_list">Група із списку</option>
          </select>
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
        <div className="flex items-center mb-2 mr-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={includeReturns}
              onChange={(e) => setIncludeReturns(e.target.checked)}
              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-sm font-medium text-gray-700">
              Врахувати повернення
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
                      {t("common.warehouse", "Warehouse")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Вид продажу
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.status", "Status")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.amount", "Amount")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Прибуток
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sales.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.number}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(row.date).toLocaleString('uk-UA')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {row.counterpartyName || t("common.unknown", "Unknown")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {row.warehouseName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.salesType === 'з ПДВ' ? 'bg-purple-100 text-purple-800' : row.salesType === 'Готівковий' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {row.salesType}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.status === "POSTED"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {row.status === "POSTED" ? "Проведено" : "Збережено"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                        {formatNum(row.amount)} {row.currency}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                        {formatNum(row.profit)} ₴
                      </td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td
                        colSpan={9}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        {t("common.noData", "No data available")}
                      </td>
                    </tr>
                  )}
                </tbody>
                {sales.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={7} className="px-4 py-3 text-right text-gray-700">
                        Всього:
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {formatNum(sales.reduce((sum, r) => sum + r.amount, 0))} ₴
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 text-sm">
                        {formatNum(sales.reduce((sum, r) => sum + r.profit, 0))} ₴
                      </td>
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
                      {t("common.customer", "Customer")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      К-сть документів
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.amount", "Amount")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Прибуток
                    </th>
                    {groupBySalesType && (
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Рентабельність %
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesByClient.map((row, index) => renderClientRow(row, index))}
                  {salesByClient.length === 0 && (
                    <tr>
                      <td
                        colSpan={groupBySalesType ? 6 : 5}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        {t("common.noData", "No data available")}
                      </td>
                    </tr>
                  )}
                </tbody>
                {salesByClient.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-gray-700">
                        Всього:
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {salesByClient.reduce((sum, r) => sum + Number(r.documentsCount), 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {formatNum(salesByClient.reduce((sum, r) => sum + Number(r.totalAmount), 0))} ₴
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 text-sm">
                        {formatNum(salesByClient.reduce((sum, r) => sum + Number(r.totalProfit), 0))} ₴
                      </td>
                      {groupBySalesType && (
                        <td className="px-4 py-3 text-right text-gray-900 text-sm">
                          {salesByClient.reduce((sum, r) => sum + Number(r.totalAmount), 0) !== 0
                            ? ((salesByClient.reduce((sum, r) => sum + Number(r.totalProfit), 0) / salesByClient.reduce((sum, r) => sum + Number(r.totalAmount), 0)) * 100).toFixed(2) + " %"
                            : "-"}
                        </td>
                      )}
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
                      {t("common.product", "Product")}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Категорія
                    </th>
                    {groupBySalesType && (
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Вид продажу
                      </th>
                    )}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      К-сть
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ціна за од. (₴)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("common.amount", "Amount")}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Закупівельна вартість
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Прибуток
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Маржинальність %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesByProduct.map((row, index) => {
                    const avgPrice = Number(row.totalQuantity) !== 0 
                      ? (Number(row.totalAmount) / Number(row.totalQuantity)).toFixed(2) 
                      : "0.00";
                    const margin = Number(row.totalAmount) !== 0 
                      ? ((Number(row.totalProfit) / Number(row.totalAmount)) * 100).toFixed(2) 
                      : "0.00";

                    return (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {row.productName}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                            {row.productCategory || "Без категорії"}
                          </span>
                        </td>
                        {groupBySalesType && (
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.salesType === 'з ПДВ' ? 'bg-purple-100 text-purple-800' : row.salesType === 'Готівковий' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {row.salesType || "-"}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                          {formatNum(row.totalQuantity)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                          {avgPrice} ₴
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-gray-900 text-right">
                          {formatNum(row.totalAmount)} ₴
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatNum(row.totalPurchaseCost)} ₴
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-green-600 text-right">
                          {formatNum(row.totalProfit)} ₴
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700 text-right">
                          {margin} %
                        </td>
                      </tr>
                    );
                  })}
                  {salesByProduct.length === 0 && (
                    <tr>
                      <td
                        colSpan={groupBySalesType ? 10 : 9}
                        className="px-6 py-10 text-center text-gray-500"
                      >
                        {t("common.noData", "No data available")}
                      </td>
                    </tr>
                  )}
                </tbody>
                {salesByProduct.length > 0 && (
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={groupBySalesType ? 4 : 3} className="px-4 py-3 text-right text-gray-700">
                        Всього:
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {formatNum(salesByProduct.reduce((sum, r) => sum + Number(r.totalQuantity), 0))}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-sm">-</td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {formatNum(salesByProduct.reduce((sum, r) => sum + Number(r.totalAmount), 0))} ₴
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500 text-sm">
                        {formatNum(salesByProduct.reduce((sum, r) => sum + Number(r.totalPurchaseCost), 0))} ₴
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 text-sm">
                        {formatNum(salesByProduct.reduce((sum, r) => sum + Number(r.totalProfit), 0))} ₴
                      </td>
                      <td className="px-4 py-3 text-right text-gray-900 text-sm">
                        {salesByProduct.reduce((sum, r) => sum + Number(r.totalAmount), 0) !== 0
                          ? ((salesByProduct.reduce((sum, r) => sum + Number(r.totalProfit), 0) / salesByProduct.reduce((sum, r) => sum + Number(r.totalAmount), 0)) * 100).toFixed(2) + " %"
                          : "0.00 %"}
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
