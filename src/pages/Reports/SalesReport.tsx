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
import { Download, Printer, ChevronDown, ChevronRight, BarChart2 } from "lucide-react";

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

type TabType = "general" | "byClient" | "byProduct" | "chart";
type GroupMode = "none" | "group" | "group_from_list";

type ChartPeriod = "day" | "week" | "month" | "year";
type ChartType = "bar" | "line" | "area";

interface PeriodBucket {
  key: string;
  label: string;
  amount: number;
  profit: number;
  count: number;
}

function aggregateSalesByPeriod(sales: SaleItem[], period: ChartPeriod): PeriodBucket[] {
  const bucketsMap = new Map<string, PeriodBucket>();

  sales.forEach((s) => {
    const d = new Date(s.date);
    if (isNaN(d.getTime())) return;

    let key = "";
    let label = "";

    if (period === "day") {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      key = `${year}-${month}-${day}`;
      label = `${day}.${month}.${year}`;
    } else if (period === "week") {
      const targetDate = new Date(d.getTime());
      const dayOfWeek = targetDate.getDay();
      const diffToMonday = targetDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(targetDate.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const mDay = String(monday.getDate()).padStart(2, "0");
      const mMonth = String(monday.getMonth() + 1).padStart(2, "0");
      const sDay = String(sunday.getDate()).padStart(2, "0");
      const sMonth = String(sunday.getMonth() + 1).padStart(2, "0");

      key = monday.toISOString().split("T")[0];
      label = `${mDay}.${mMonth} - ${sDay}.${sMonth}`;
    } else if (period === "month") {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      key = `${year}-${month}`;

      const monthNames = [
        "Січ", "Лют", "Бер", "Квіт", "Трав", "Черв",
        "Лип", "Серп", "Вер", "Жовт", "Лист", "Груд"
      ];
      label = `${monthNames[d.getMonth()]} ${year}`;
    } else if (period === "year") {
      const year = d.getFullYear();
      key = `${year}`;
      label = `${year} р.`;
    }

    if (!bucketsMap.has(key)) {
      bucketsMap.set(key, {
        key,
        label,
        amount: 0,
        profit: 0,
        count: 0,
      });
    }

    const bucket = bucketsMap.get(key)!;
    bucket.amount += Number(s.amount || 0);
    bucket.profit += Number(s.profit || 0);
    bucket.count += 1;
  });

  return Array.from(bucketsMap.values()).sort((a, b) => a.key.localeCompare(b.key));
}

function SalesChart({ sales }: { sales: SaleItem[] }) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("day");
  const [showSales, setShowSales] = useState<boolean>(true);
  const [showProfit, setShowProfit] = useState<boolean>(true);
  const [hoveredBucket, setHoveredBucket] = useState<PeriodBucket | null>(null);

  const buckets = useMemo(() => {
    return aggregateSalesByPeriod(sales, chartPeriod);
  }, [sales, chartPeriod]);

  const totalSales = useMemo(() => buckets.reduce((sum, b) => sum + b.amount, 0), [buckets]);
  const totalProfit = useMemo(() => buckets.reduce((sum, b) => sum + b.profit, 0), [buckets]);
  const totalDocs = useMemo(() => buckets.reduce((sum, b) => sum + b.count, 0), [buckets]);
  const avgCheck = totalDocs > 0 ? totalSales / totalDocs : 0;

  const maxVal = useMemo(() => {
    let max = 0;
    buckets.forEach((b) => {
      if (showSales && b.amount > max) max = b.amount;
      if (showProfit && b.profit > max) max = b.profit;
    });
    return max > 0 ? max * 1.15 : 100;
  }, [buckets, showSales, showProfit]);

  const svgWidth = 800;
  const svgHeight = 320;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (buckets.length <= 1) return paddingLeft + chartW / 2;
    return paddingLeft + (index / (buckets.length - 1)) * chartW;
  };

  const getBarX = (index: number, barWidth: number) => {
    const slotW = chartW / buckets.length;
    return paddingLeft + index * slotW + (slotW - barWidth) / 2;
  };

  const getY = (val: number) => {
    const ratio = Math.max(0, val) / maxVal;
    return paddingTop + chartH - ratio * chartH;
  };

  const getPathD = (metric: "amount" | "profit") => {
    if (buckets.length === 0) return "";
    return buckets
      .map((b, i) => {
        const x = buckets.length === 1 ? paddingLeft + chartW / 2 : getX(i);
        const y = getY(metric === "amount" ? b.amount : b.profit);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  };

  const getAreaD = (metric: "amount" | "profit") => {
    if (buckets.length === 0) return "";
    const lineD = getPathD(metric);
    const lastX = buckets.length === 1 ? paddingLeft + chartW / 2 : getX(buckets.length - 1);
    const firstX = buckets.length === 1 ? paddingLeft + chartW / 2 : getX(0);
    const bottomY = paddingTop + chartH;
    return `${lineD} L ${lastX.toFixed(1)},${bottomY} L ${firstX.toFixed(1)},${bottomY} Z`;
  };

  return (
    <div className="p-6 space-y-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Сума продажів
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {totalSales.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Прибуток
          </div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalProfit.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </div>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-lg">
          <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Середній чек
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {avgCheck.toLocaleString('uk-UA', { minimumFractionDigits: 2 })} ₴
          </div>
        </div>

        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Всього документів
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
            {totalDocs}
          </div>
        </div>
      </div>

      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Тип графіку:
          </span>
          <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden">
            <button
              type="button"
              onClick={() => setChartType("bar")}
              className={`px-3 py-1.5 text-xs font-medium ${
                chartType === "bar"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Стовпчастий
            </button>
            <button
              type="button"
              onClick={() => setChartType("line")}
              className={`px-3 py-1.5 text-xs font-medium border-l border-gray-300 dark:border-gray-600 ${
                chartType === "line"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Лінійний
            </button>
            <button
              type="button"
              onClick={() => setChartType("area")}
              className={`px-3 py-1.5 text-xs font-medium border-l border-gray-300 dark:border-gray-600 ${
                chartType === "area"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              З областю
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Період:
          </span>
          <select
            value={chartPeriod}
            onChange={(e) => setChartPeriod(e.target.value as ChartPeriod)}
            className="border border-gray-300 dark:border-gray-600 px-3 py-1.5 rounded-md text-xs bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="day">По дням</option>
            <option value="week">По тижнях</option>
            <option value="month">По місяцях</option>
            <option value="year">По роках</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showSales}
              onChange={(e) => setShowSales(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 mr-0.5"></span>
            Продажі
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showProfit}
              onChange={(e) => setShowProfit(e.target.checked)}
              className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
            />
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 mr-0.5"></span>
            Прибуток
          </label>
        </div>
      </div>

      {/* SVG Chart Area */}
      {buckets.length === 0 ? (
        <div className="py-16 text-center text-gray-400 text-sm">
          Немає даних для відображення графіка за вибраний період або фільтри.
        </div>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto max-h-[420px] select-none"
          >
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y-Axis Grid Lines & Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const val = maxVal * (1 - ratio);
              const y = paddingTop + ratio * chartH;
              return (
                <g key={ratio}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#e5e7eb"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-gray-400 font-medium"
                  >
                    {Math.round(val).toLocaleString("uk-UA")} ₴
                  </text>
                </g>
              );
            })}

            {/* Area Chart Mode */}
            {chartType === "area" && (
              <>
                {showSales && (
                  <path d={getAreaD("amount")} fill="url(#salesGrad)" />
                )}
                {showProfit && (
                  <path d={getAreaD("profit")} fill="url(#profitGrad)" />
                )}
              </>
            )}

            {/* Bar Chart Mode */}
            {chartType === "bar" && (
              <>
                {buckets.map((b, i) => {
                  const slotW = chartW / buckets.length;
                  const numMetrics = (showSales ? 1 : 0) + (showProfit ? 1 : 0);
                  if (numMetrics === 0) return null;

                  const totalBarGroupW = Math.min(slotW * 0.7, 45);
                  const singleBarW = totalBarGroupW / numMetrics;
                  const startX = getBarX(i, totalBarGroupW);

                  const salesY = getY(b.amount);
                  const salesH = paddingTop + chartH - salesY;
                  const profitY = getY(b.profit);
                  const profitH = paddingTop + chartH - profitY;

                  return (
                    <g
                      key={b.key}
                      onMouseEnter={() => setHoveredBucket(b)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      className="cursor-pointer transition-opacity hover:opacity-80"
                    >
                      {showSales && (
                        <rect
                          x={startX}
                          y={salesY}
                          width={singleBarW}
                          height={Math.max(2, salesH)}
                          fill="#2563eb"
                          rx="3"
                        />
                      )}
                      {showProfit && (
                        <rect
                          x={startX + (showSales ? singleBarW : 0)}
                          y={profitY}
                          width={singleBarW}
                          height={Math.max(2, profitH)}
                          fill="#10b981"
                          rx="3"
                        />
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {/* Line / Area Lines & Points */}
            {(chartType === "line" || chartType === "area") && (
              <>
                {showSales && (
                  <path
                    d={getPathD("amount")}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {showProfit && (
                  <path
                    d={getPathD("profit")}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points */}
                {buckets.map((b, i) => {
                  const x = buckets.length === 1 ? paddingLeft + chartW / 2 : getX(i);
                  const sY = getY(b.amount);
                  const pY = getY(b.profit);
                  return (
                    <g
                      key={b.key}
                      onMouseEnter={() => setHoveredBucket(b)}
                      onMouseLeave={() => setHoveredBucket(null)}
                      className="cursor-pointer"
                    >
                      <line
                        x1={x}
                        y1={paddingTop}
                        x2={x}
                        y2={paddingTop + chartH}
                        stroke="transparent"
                        strokeWidth={Math.max(12, chartW / buckets.length)}
                      />
                      {showSales && (
                        <circle
                          cx={x}
                          cy={sY}
                          r={hoveredBucket?.key === b.key ? 6 : 4}
                          fill="#2563eb"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all"
                        />
                      )}
                      {showProfit && (
                        <circle
                          cx={x}
                          cy={pY}
                          r={hoveredBucket?.key === b.key ? 6 : 4}
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2"
                          className="transition-all"
                        />
                      )}
                    </g>
                  );
                })}
              </>
            )}

            {/* X-Axis Labels */}
            {buckets.map((b, i) => {
              const step = Math.ceil(buckets.length / 12);
              if (i % step !== 0 && i !== buckets.length - 1) return null;

              const x =
                chartType === "bar"
                  ? paddingLeft + (i + 0.5) * (chartW / buckets.length)
                  : buckets.length === 1
                  ? paddingLeft + chartW / 2
                  : getX(i);

              return (
                <text
                  key={b.key}
                  x={x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className="text-[11px] fill-gray-500 font-medium"
                >
                  {b.label}
                </text>
              );
            })}
          </svg>

          {/* Hover Tooltip Card */}
          {hoveredBucket && (
            <div className="absolute top-2 right-4 bg-gray-900/90 text-white p-3 rounded-lg shadow-xl text-xs space-y-1 z-30 pointer-events-none backdrop-blur-sm border border-gray-700">
              <div className="font-bold text-gray-200 border-b border-gray-700 pb-1 mb-1">
                {hoveredBucket.label}
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-blue-400">Продажі:</span>
                <span className="font-bold">
                  {hoveredBucket.amount.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} ₴
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-emerald-400">Прибуток:</span>
                <span className="font-bold">
                  {hoveredBucket.profit.toLocaleString("uk-UA", { minimumFractionDigits: 2 })} ₴
                </span>
              </div>
              <div className="flex justify-between gap-4 text-gray-400 pt-0.5 border-t border-gray-700/50">
                <span>Документів:</span>
                <span className="font-medium text-gray-300">{hoveredBucket.count}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
      if (activeTab === "general" || activeTab === "chart") {
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

        // Group mode filters for general & chart tab
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
    if (sales.length === 0 && (activeTab === "general" || activeTab === "chart")) return;

    let excelData: any[] = [];
    let sheetName = "Звіт_По_Продажам";

    if (activeTab === "general" || activeTab === "chart") {
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
        <button
          className={`pb-3 px-2 transition-all duration-200 border-b-2 flex items-center gap-1.5 ${activeTab === "chart" ? "border-blue-600 text-blue-600 font-semibold" : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"}`}
          onClick={() => setActiveTab("chart")}
        >
          <BarChart2 size={16} />
          Графік
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
          {activeTab === "chart" && <SalesChart sales={sales} />}

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
