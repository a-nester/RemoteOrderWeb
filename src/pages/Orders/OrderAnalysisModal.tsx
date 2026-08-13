import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Search, RefreshCw, Download, Printer, ArrowUpDown, ArrowUp, ArrowDown, Users, Package, Weight, DollarSign, Calendar } from 'lucide-react';
import { OrderService } from '../../services/order.service';
import { ProductsService } from '../../services/products.service';
import type { Order } from '../../types/order';
import type { Product } from '../../types/product';

interface OrderAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStartDate?: string;
  initialEndDate?: string;
}

interface CounterpartyAnalysis {
  counterpartyId: string;
  counterpartyName: string;
  ordersCount: number;
  totalWeight: number; // in kg
  totalAmount: number; // in UAH
  avgPricePerKg: number; // in UAH/kg
}

type SortField = 'name' | 'ordersCount' | 'weight' | 'amount';
type SortDirection = 'asc' | 'desc';

export default function OrderAnalysisModal({
  isOpen,
  onClose,
  initialStartDate,
  initialEndDate
}: OrderAnalysisModalProps) {
  const { t } = useTranslation();

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    if (initialStartDate) return initialStartDate;
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    if (initialEndDate) return initialEndDate;
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  const [orders, setOrders] = useState<Order[]>([]);
  const [productsMap, setProductsMap] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('amount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Load products once and load orders on modal open or filter apply
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch products if not already loaded
      let pMap = productsMap;
      if (pMap.size === 0) {
        const prodRes = await ProductsService.fetchProducts();
        pMap = new Map((prodRes.products || []).map(p => [p.id, p]));
        setProductsMap(pMap);
      }

      // 2. Fetch orders for selected period
      const fetchedOrders = await OrderService.getOrders({
        startDate,
        endDate
      });

      // Filter out soft-deleted orders if any
      const activeOrders = fetchedOrders.filter(o => !o.isDeleted);
      setOrders(activeOrders);
    } catch (error) {
      console.error('Failed to load analysis data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Quick Date Presets
  const applyPreset = (preset: 'today' | 'thisWeek' | 'thisMonth' | 'lastMonth') => {
    const today = new Date();
    let s = new Date();
    let e = new Date();

    if (preset === 'today') {
      s = today;
      e = today;
    } else if (preset === 'thisWeek') {
      const day = today.getDay() || 7; // Sunday is 7 in ISO
      s.setDate(today.getDate() - day + 1);
      e = new Date(s);
      e.setDate(s.getDate() + 6);
    } else if (preset === 'thisMonth') {
      s = new Date(today.getFullYear(), today.getMonth(), 1);
      e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (preset === 'lastMonth') {
      s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      e = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    const startStr = s.toISOString().split('T')[0];
    const endStr = e.toISOString().split('T')[0];
    setStartDate(startStr);
    setEndDate(endStr);
  };

  // Process and group orders by counterparty
  const analysisData: CounterpartyAnalysis[] = useMemo(() => {
    const groups = new Map<string, {
      name: string;
      ordersCount: number;
      totalWeight: number;
      totalAmount: number;
    }>();

    for (const order of orders) {
      const cId = order.counterpartyId || order.counterpartyName || 'unknown';
      const cName = order.counterpartyName || 'Невідомий клієнт';
      const amount = Number(order.amount || 0);

      // Calculate weight for order
      let orderWeight = 0;
      if (Array.isArray(order.items)) {
        for (const item of order.items) {
          const product = productsMap.get(item.productId);
          const unit = item.unit || product?.unit || '';
          const qty = Number(item.quantity || 0);

          if (unit === 'кг') {
            orderWeight += qty;
          } else if (product?.weight && Number(product.weight) > 0) {
            orderWeight += qty * Number(product.weight);
          }
        }
      }

      const existing = groups.get(cId);
      if (existing) {
        existing.ordersCount += 1;
        existing.totalAmount += amount;
        existing.totalWeight += orderWeight;
      } else {
        groups.set(cId, {
          name: cName,
          ordersCount: 1,
          totalAmount: amount,
          totalWeight: orderWeight
        });
      }
    }

    const result: CounterpartyAnalysis[] = [];
    groups.forEach((val, id) => {
      result.push({
        counterpartyId: id,
        counterpartyName: val.name,
        ordersCount: val.ordersCount,
        totalWeight: val.totalWeight,
        totalAmount: val.totalAmount,
        avgPricePerKg: val.totalWeight > 0 ? (val.totalAmount / val.totalWeight) : 0
      });
    });

    return result;
  }, [orders, productsMap]);

  // Filter and Sort
  const filteredAndSortedData = useMemo(() => {
    return analysisData
      .filter(item =>
        item.counterpartyName.toLowerCase().includes(searchTerm.toLowerCase().trim())
      )
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'name') {
          diff = a.counterpartyName.localeCompare(b.counterpartyName);
        } else if (sortField === 'ordersCount') {
          diff = a.ordersCount - b.ordersCount;
        } else if (sortField === 'weight') {
          diff = a.totalWeight - b.totalWeight;
        } else if (sortField === 'amount') {
          diff = a.totalAmount - b.totalAmount;
        }
        return sortDirection === 'asc' ? diff : -diff;
      });
  }, [analysisData, searchTerm, sortField, sortDirection]);

  // Totals calculations
  const totals = useMemo(() => {
    return filteredAndSortedData.reduce(
      (acc, curr) => ({
        clientsCount: acc.clientsCount + 1,
        ordersCount: acc.ordersCount + curr.ordersCount,
        totalWeight: acc.totalWeight + curr.totalWeight,
        totalAmount: acc.totalAmount + curr.totalAmount
      }),
      { clientsCount: 0, ordersCount: 0, totalWeight: 0, totalAmount: 0 }
    );
  }, [filteredAndSortedData]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc'); // default to descending for numeric values
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['№', 'Контрагент', 'К-сть замовлень', 'Загальна вага (кг)', 'Загальна сума (грн)', 'Сер. ціна за 1 кг (грн/кг)'];
    const rows = filteredAndSortedData.map((item, index) => [
      index + 1,
      `"${item.counterpartyName.replace(/"/g, '""')}"`,
      item.ordersCount,
      item.totalWeight.toFixed(2),
      item.totalAmount.toFixed(2),
      item.avgPricePerKg.toFixed(2)
    ]);

    // Add totals row
    rows.push([
      'Всього',
      `"${totals.clientsCount} контрагентів"`,
      totals.ordersCount,
      totals.totalWeight.toFixed(2),
      totals.totalAmount.toFixed(2),
      totals.totalWeight > 0 ? (totals.totalAmount / totals.totalWeight).toFixed(2) : '0.00'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `analiz_zamovlen_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report
  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-5xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Package size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Аналіз замовлень по контрагентах
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Зведені дані ваги та суми замовлень за обраний період
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters & Actions Toolbar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
          
          {/* Top filter row: Dates and Presets */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                <Calendar size={16} className="text-gray-400 ml-2" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-sm border-0 text-gray-800 dark:text-gray-200 focus:ring-0 p-1"
                />
                <span className="text-gray-400 text-sm">—</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-sm border-0 text-gray-800 dark:text-gray-200 focus:ring-0 p-1"
                />
              </div>

              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                Розрахувати
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => applyPreset('today')}
                className="px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
              >
                Сьогодні
              </button>
              <button
                onClick={() => applyPreset('thisWeek')}
                className="px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
              >
                Цей тиждень
              </button>
              <button
                onClick={() => applyPreset('thisMonth')}
                className="px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
              >
                Цей місяць
              </button>
              <button
                onClick={() => applyPreset('lastMonth')}
                className="px-2.5 py-1 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-colors"
              >
                Попередній місяць
              </button>
            </div>
          </div>

          {/* Search and Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Пошук за назвою контрагента..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 dark:text-white sm:text-sm h-9 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={filteredAndSortedData.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                title="Експорт в Excel / CSV"
              >
                <Download size={15} />
                Експорт CSV
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
                title="Друк"
              >
                <Printer size={15} />
                Друк
              </button>
            </div>
          </div>

          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
            <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md">
                <Users size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Контрагентів</div>
                <div className="text-base font-bold text-gray-900 dark:text-white">{totals.clientsCount}</div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-md">
                <Package size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Замовлень</div>
                <div className="text-base font-bold text-gray-900 dark:text-white">{totals.ordersCount}</div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-md">
                <Weight size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Загальна вага</div>
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  {totals.totalWeight.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} кг
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/40 p-3 rounded-lg border border-gray-100 dark:border-gray-700 flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md">
                <DollarSign size={18} />
              </div>
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Загальна сума</div>
                <div className="text-base font-bold text-gray-900 dark:text-white">
                  {totals.totalAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Main Table Area */}
        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider select-none">
              <tr>
                <th className="px-4 py-3 text-left w-12">№</th>
                
                {/* Counterparty Sort Header */}
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    Контрагент
                    {sortField === 'name' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-400" />
                    )}
                  </div>
                </th>

                {/* Orders Count Sort Header */}
                <th
                  onClick={() => handleSort('ordersCount')}
                  className="px-4 py-3 text-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    К-сть замовлень
                    {sortField === 'ordersCount' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-400" />
                    )}
                  </div>
                </th>

                {/* Weight Sort Header */}
                <th
                  onClick={() => handleSort('weight')}
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Вага (кг)
                    {sortField === 'weight' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-400" />
                    )}
                  </div>
                </th>

                {/* Amount Sort Header */}
                <th
                  onClick={() => handleSort('amount')}
                  className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Сума (грн)
                    {sortField === 'amount' ? (
                      sortDirection === 'asc' ? <ArrowUp size={14} className="text-indigo-600" /> : <ArrowDown size={14} className="text-indigo-600" />
                    ) : (
                      <ArrowUpDown size={14} className="text-gray-400" />
                    )}
                  </div>
                </th>

                <th className="px-4 py-3 text-right">
                  Сер. ціна / кг
                </th>
              </tr>
            </thead>

            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="animate-spin text-indigo-600" size={20} />
                      {t('common.loading', 'Завантаження даних...')}
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    {t('common.noData', 'Замовлень за обраний період не знайдено')}
                  </td>
                </tr>
              ) : (
                filteredAndSortedData.map((item, index) => (
                  <tr
                    key={item.counterpartyId}
                    className="hover:bg-indigo-50/40 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 whitespace-nowrap text-xs text-gray-400 font-mono">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                      {item.counterpartyName}
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-center text-gray-600 dark:text-gray-300">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                        {item.ordersCount}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right font-medium text-gray-900 dark:text-white font-mono">
                      {item.totalWeight.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} кг
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      {item.totalAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-right text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {item.avgPricePerKg > 0 ? `${item.avgPricePerKg.toFixed(2)} ₴` : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            {/* Table Footer: Total Sums & Weights */}
            {filteredAndSortedData.length > 0 && (
              <tfoot className="bg-gray-100 dark:bg-gray-900 font-bold text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-600 sticky bottom-0 z-10 text-sm">
                <tr>
                  <td className="px-4 py-3" colSpan={2}>
                    <div className="flex items-center gap-2">
                      <span>РАЗОМ / ВСЬОГО:</span>
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        ({totals.clientsCount} контрагентів)
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                      {totals.ordersCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-amber-700 dark:text-amber-400">
                    {totals.totalWeight.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} кг
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700 dark:text-emerald-400 text-base">
                    {totals.totalAmount.toLocaleString('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₴
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-xs text-gray-600 dark:text-gray-400">
                    {totals.totalWeight > 0 ? `${(totals.totalAmount / totals.totalWeight).toFixed(2)} ₴` : '—'}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between items-center px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Період: <span className="font-medium text-gray-700 dark:text-gray-300">{startDate}</span> — <span className="font-medium text-gray-700 dark:text-gray-300">{endDate}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Закрити
          </button>
        </div>

      </div>
    </div>
  );
}
