import { useState, useEffect, useMemo } from 'react';
import { X, Printer, Save, CheckSquare, Square, Truck, AlertCircle } from 'lucide-react';
import { RealizationService } from '../services/realization.service';
import { RouteSheetService } from '../services/routeSheet.service';
import type { Realization } from '../types/realization';
import type { RouteSheet } from '../types/routeSheet';

interface RouteSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    routeSheetId?: string | null;
    onSaved?: (routeSheet: RouteSheet) => void;
}

export default function RouteSheetModal({
    isOpen,
    onClose,
    routeSheetId,
    onSaved
}: RouteSheetModalProps) {
    const formatDateYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const todayStr = useMemo(() => formatDateYMD(new Date()), []);

    // Form header state
    const [date, setDate] = useState<string>(todayStr);
    const [datePreset, setDatePreset] = useState<'today' | 'tomorrow' | 'week' | 'custom'>('today');
    const [startDate, setStartDate] = useState<string>(todayStr);
    const [endDate, setEndDate] = useState<string>(todayStr);

    const [driverName, setDriverName] = useState('');
    const [comment, setComment] = useState('');

    // Realizations & items selection state
    const [allRealizations, setAllRealizations] = useState<Realization[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [paymentsMap, setPaymentsMap] = useState<Record<string, number>>({});
    const [savedRouteSheet, setSavedRouteSheet] = useState<RouteSheet | null>(null);

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Quick Date Presets
    const applyDatePreset = (preset: 'today' | 'tomorrow' | 'week') => {
        setDatePreset(preset);
        const now = new Date();

        if (preset === 'today') {
            const str = formatDateYMD(now);
            setDate(str);
            setStartDate(str);
            setEndDate(str);
        } else if (preset === 'tomorrow') {
            const tom = new Date(now);
            tom.setDate(now.getDate() + 1);
            const str = formatDateYMD(tom);
            setDate(str);
            setStartDate(str);
            setEndDate(str);
        } else if (preset === 'week') {
            const dayOfWeek = now.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);

            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);

            const startStr = formatDateYMD(monday);
            const endStr = formatDateYMD(sunday);
            setDate(formatDateYMD(now));
            setStartDate(startStr);
            setEndDate(endStr);
        }
    };

    // Load initial data when opening
    useEffect(() => {
        if (!isOpen) return;

        let isMounted = true;
        setLoading(true);

        const init = async () => {
            try {
                const realizationsData = await RealizationService.getAll();
                if (!isMounted) return;
                setAllRealizations(realizationsData);

                if (routeSheetId) {
                    // Edit existing RouteSheet mode
                    const existing = await RouteSheetService.getById(routeSheetId);
                    if (!isMounted) return;

                    setSavedRouteSheet(existing);
                    setDate(existing.date ? formatDateYMD(new Date(existing.date)) : todayStr);
                    setStartDate(existing.date ? formatDateYMD(new Date(existing.date)) : todayStr);
                    setEndDate(existing.date ? formatDateYMD(new Date(existing.date)) : todayStr);
                    setDriverName(existing.driverName || '');
                    setComment(existing.comment || '');

                    const ids = new Set<string>();
                    const pays: Record<string, number> = {};

                    (existing.items || []).forEach(item => {
                        ids.add(item.realizationId);
                        pays[item.realizationId] = Number(item.clientPayment !== undefined ? item.clientPayment : item.realizationAmount || 0);
                    });

                    setSelectedIds(ids);
                    setPaymentsMap(pays);
                } else {
                    // Create new RouteSheet mode
                    setSavedRouteSheet(null);
                    applyDatePreset('today');
                    setDriverName('');
                    setComment('');
                    setSelectedIds(new Set());
                    setPaymentsMap({});
                }
            } catch (err) {
                console.error('Failed to load data in RouteSheetModal', err);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        init();
        return () => {
            isMounted = false;
        };
    }, [isOpen, routeSheetId]);

    // Filter realizations according to date range and search
    const filteredRealizations = useMemo(() => {
        return allRealizations.filter(r => {
            if (r.isDeleted) return false;

            // Date filtering
            if (startDate || endDate) {
                const rDateStr = r.date ? formatDateYMD(new Date(r.date)) : '';
                if (startDate && rDateStr < startDate) return false;
                if (endDate && rDateStr > endDate) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const numMatch = (r.number || '').toLowerCase().includes(q);
                const cpMatch = (r.counterpartyName || '').toLowerCase().includes(q);
                const groupMatch = (r.counterpartyGroupName || '').toLowerCase().includes(q);
                if (!numMatch && !cpMatch && !groupMatch) return false;
            }

            return true;
        });
    }, [allRealizations, startDate, endDate, searchQuery]);

    // Toggle single invoice checkbox
    const toggleSelect = (r: Realization) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(r.id)) {
                next.delete(r.id);
            } else {
                next.add(r.id);
                // Initialize default client payment to invoice amount if not set yet
                if (paymentsMap[r.id] === undefined) {
                    setPaymentsMap(p => ({
                        ...p,
                        [r.id]: Number(r.amount || 0)
                    }));
                }
            }
            return next;
        });
    };

    // Toggle select all visible
    const isAllVisibleSelected = useMemo(() => {
        if (filteredRealizations.length === 0) return false;
        return filteredRealizations.every(r => selectedIds.has(r.id));
    }, [filteredRealizations, selectedIds]);

    const toggleSelectAll = () => {
        if (isAllVisibleSelected) {
            // Deselect visible
            setSelectedIds(prev => {
                const next = new Set(prev);
                filteredRealizations.forEach(r => next.delete(r.id));
                return next;
            });
        } else {
            // Select all visible
            setSelectedIds(prev => {
                const next = new Set(prev);
                filteredRealizations.forEach(r => {
                    next.add(r.id);
                    if (paymentsMap[r.id] === undefined) {
                        setPaymentsMap(p => ({ ...p, [r.id]: Number(r.amount || 0) }));
                    }
                });
                return next;
            });
        }
    };

    // Update payment for a realization
    const handlePaymentChange = (realizationId: string, value: string) => {
        const num = parseFloat(value);
        setPaymentsMap(prev => ({
            ...prev,
            [realizationId]: isNaN(num) ? 0 : num
        }));
    };

    // Totals of currently selected invoices
    const totals = useMemo(() => {
        let totalAmount = 0;
        let totalPayment = 0;

        selectedIds.forEach(id => {
            const r = allRealizations.find(item => item.id === id);
            if (r) {
                totalAmount += Number(r.amount || 0);
                totalPayment += paymentsMap[id] !== undefined ? paymentsMap[id] : Number(r.amount || 0);
            }
        });

        return {
            count: selectedIds.size,
            totalAmount,
            totalPayment
        };
    }, [selectedIds, allRealizations, paymentsMap]);

    // Save Route Sheet
    const handleSave = async () => {
        if (selectedIds.size === 0) {
            alert('Будь ласка, виберіть хоча б одну накладну для маршрутного листа');
            return;
        }

        setSaving(true);
        try {
            const items = Array.from(selectedIds).map((relId, idx) => ({
                realizationId: relId,
                clientPayment: paymentsMap[relId] !== undefined ? paymentsMap[relId] : 0,
                sortOrder: idx + 1
            }));

            let result: RouteSheet;
            if (savedRouteSheet?.id) {
                result = await RouteSheetService.update(savedRouteSheet.id, {
                    date,
                    driverName,
                    comment,
                    items
                });
            } else {
                result = await RouteSheetService.create({
                    date,
                    driverName,
                    comment,
                    items
                });
            }

            setSavedRouteSheet(result);
            if (onSaved) onSaved(result);
            alert(`Маршрутний лист № ${result.number} успішно збережено! Кнопка «Друк» тепер активна.`);
        } catch (err: any) {
            console.error('Failed to save route sheet', err);
            alert(err.response?.data?.message || err.message || 'Помилка збереження маршрутного листа');
        } finally {
            setSaving(false);
        }
    };

    // Handle Print
    const handlePrint = () => {
        if (!savedRouteSheet?.id) {
            alert('Друк активний тільки після збереження маршруту');
            return;
        }
        window.open(`/route-sheets/${savedRouteSheet.id}/print`, '_blank');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4 backdrop-blur-xs">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Header */}
                <div className="flex flex-wrap justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg">
                            <Truck size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {savedRouteSheet ? `Маршрутний лист № ${savedRouteSheet.number}` : 'Формування маршрутного листа'}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Виберіть накладні та за потреби вкажіть суму оплати клієнта
                            </p>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || selectedIds.size === 0}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm transition-colors ${
                                saving || selectedIds.size === 0
                                    ? 'bg-indigo-400 cursor-not-allowed opacity-60'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            <Save size={16} className="mr-1.5" />
                            {saving ? 'Збереження...' : 'Зберегти'}
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={!savedRouteSheet}
                            title={!savedRouteSheet ? 'Друк активний тільки після збереження маршруту' : 'Друкувати маршрутний лист'}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition-colors ${
                                savedRouteSheet
                                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Printer size={16} className="mr-1.5" />
                            Друк
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md ml-1"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Filter and Details Bar */}
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                        {/* Quick Date Presets */}
                        <div className="md:col-span-5">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Фільтр за датою накладних:
                            </label>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <div className="inline-flex rounded-md shadow-xs border border-gray-300 dark:border-gray-600 overflow-hidden h-[36px]">
                                    <button
                                        type="button"
                                        onClick={() => applyDatePreset('today')}
                                        className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                                            datePreset === 'today'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        Сьогодні
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyDatePreset('tomorrow')}
                                        className={`px-3 py-1.5 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                                            datePreset === 'tomorrow'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        Завтра
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => applyDatePreset('week')}
                                        className={`px-3 py-1.5 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                                            datePreset === 'week'
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        Тиждень
                                    </button>
                                </div>

                                <div className="flex items-center gap-1">
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setDatePreset('custom');
                                        }}
                                        className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1.5 text-xs h-[36px]"
                                    />
                                    <span className="text-gray-400 text-xs">-</span>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setDatePreset('custom');
                                        }}
                                        className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1.5 text-xs h-[36px]"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Driver & Date of Route Sheet */}
                        <div className="md:col-span-3">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Дата маршруту:
                            </label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1.5 text-xs h-[36px]"
                            />
                        </div>

                        <div className="md:col-span-4">
                            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                Водій / Експедитор:
                            </label>
                            <input
                                type="text"
                                placeholder="ПІБ водія або авто..."
                                value={driverName}
                                onChange={(e) => setDriverName(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1.5 text-xs h-[36px]"
                            />
                        </div>
                    </div>

                    {/* Search and Summary bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex-1 min-w-[200px]">
                            <input
                                type="text"
                                placeholder="Пошук за номером, клієнтом, папкою..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md px-3 py-1 text-xs h-[34px]"
                            />
                        </div>

                        <div className="flex items-center gap-4 text-xs font-medium">
                            <div className="text-gray-600 dark:text-gray-300">
                                Знайдено накладних: <span className="font-bold text-gray-900 dark:text-white">{filteredRealizations.length}</span>
                            </div>
                            <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md font-semibold border border-indigo-200 dark:border-indigo-800">
                                Вибрано: {totals.count} накладних | Сума: {totals.totalAmount.toFixed(2)} грн | Оплата: {totals.totalPayment.toFixed(2)} грн
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table of Realizations */}
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="py-12 text-center text-gray-500">Завантаження накладних...</div>
                    ) : filteredRealizations.length === 0 ? (
                        <div className="py-12 text-center text-gray-500 flex flex-col items-center">
                            <AlertCircle size={36} className="text-gray-400 mb-2" />
                            <span>Накладних за вибраний період не знайдено</span>
                            <span className="text-xs text-gray-400 mt-1">Спробуйте змінити період або скинути пошук</span>
                        </div>
                    ) : (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                                <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold">
                                    <tr>
                                        <th className="px-3 py-2.5 text-center w-10">
                                            <button
                                                type="button"
                                                onClick={toggleSelectAll}
                                                className="text-gray-600 dark:text-gray-300 hover:text-indigo-600"
                                            >
                                                {isAllVisibleSelected ? (
                                                    <CheckSquare size={16} className="text-indigo-600" />
                                                ) : (
                                                    <Square size={16} />
                                                )}
                                            </button>
                                        </th>
                                        <th className="px-3 py-2.5 text-left">Накладна</th>
                                        <th className="px-3 py-2.5 text-left">Дата</th>
                                        <th className="px-3 py-2.5 text-left">Клієнт (Одержувач)</th>
                                        <th className="px-3 py-2.5 text-left">Папка / Район</th>
                                        <th className="px-3 py-2.5 text-left">Адреса</th>
                                        <th className="px-3 py-2.5 text-right w-24">Сума, грн</th>
                                        <th className="px-3 py-2.5 text-right w-32 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-200">
                                            Оплата клієнта, грн
                                        </th>
                                        <th className="px-3 py-2.5 text-center w-20">Статус</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                    {filteredRealizations.map((r) => {
                                        const isChecked = selectedIds.has(r.id);
                                        const paymentValue = paymentsMap[r.id] !== undefined ? paymentsMap[r.id] : Number(r.amount || 0);

                                        return (
                                            <tr
                                                key={r.id}
                                                className={`transition-colors ${
                                                    isChecked
                                                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30'
                                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                }`}
                                            >
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleSelect(r)}
                                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                                    № {r.number}
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                                    {r.date ? new Date(r.date).toLocaleDateString('uk-UA') : ''}
                                                </td>
                                                <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">
                                                    {r.counterpartyName || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                                    📁 {r.counterpartyGroupName || 'Без групи'}
                                                </td>
                                                <td className="px-3 py-2 text-gray-500 dark:text-gray-400 truncate max-w-xs" title={r.counterpartyAddress}>
                                                    {r.counterpartyAddress || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                                    {Number(r.amount || 0).toFixed(2)}
                                                </td>
                                                <td className="px-3 py-2 text-right bg-yellow-50/50 dark:bg-yellow-950/10">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={paymentValue}
                                                        onChange={(e) => handlePaymentChange(r.id, e.target.value)}
                                                        disabled={!isChecked}
                                                        className={`w-28 text-right font-bold rounded border px-2 py-1 text-xs focus:ring-indigo-500 focus:border-indigo-500 ${
                                                            isChecked
                                                                ? 'border-yellow-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white'
                                                                : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        }`}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center whitespace-nowrap">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                                            r.status === 'POSTED'
                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                        }`}
                                                    >
                                                        {r.status === 'POSTED' ? 'Проведено' : 'Чернетка'}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-4 text-xs font-semibold">
                        <div>
                            Накладних у маршруті: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{totals.count}</span>
                        </div>
                        <div>
                            Загальна сума: <span className="text-gray-900 dark:text-white font-bold">{totals.totalAmount.toFixed(2)} ₴</span>
                        </div>
                        <div>
                            Всього до оплати: <span className="text-green-600 dark:text-green-400 font-bold">{totals.totalPayment.toFixed(2)} ₴</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md"
                        >
                            Закрити
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || selectedIds.size === 0}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm ${
                                saving || selectedIds.size === 0
                                    ? 'bg-indigo-400 cursor-not-allowed opacity-60'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                        >
                            <Save size={16} className="mr-1.5" />
                            {saving ? 'Збереження...' : 'Зберегти'}
                        </button>

                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={!savedRouteSheet}
                            title={!savedRouteSheet ? 'Друк активний тільки після збереження маршруту' : 'Друкувати маршрутний лист'}
                            className={`flex items-center px-4 py-2 rounded-md text-sm font-semibold shadow-sm ${
                                savedRouteSheet
                                    ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Printer size={16} className="mr-1.5" />
                            Друк
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
