import { useState, useEffect, useMemo } from 'react';
import { Plus, Printer, Edit, Trash2, Search, Truck, AlertCircle } from 'lucide-react';
import { RouteSheetService } from '../../services/routeSheet.service';
import type { RouteSheet } from '../../types/routeSheet';
import RouteSheetModal from '../../components/RouteSheetModal';

export default function RouteSheetList() {

    const [routeSheets, setRouteSheets] = useState<RouteSheet[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Date filters with preset
    const formatDateYMD = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getPresetRange = (preset: string): { start: string; end: string } => {
        const now = new Date();
        if (preset === 'today') {
            const today = formatDateYMD(now);
            return { start: today, end: today };
        }
        if (preset === 'week') {
            const dayOfWeek = now.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const monday = new Date(now);
            monday.setDate(now.getDate() + diffToMonday);
            const sunday = new Date(monday);
            sunday.setDate(monday.getDate() + 6);
            return { start: formatDateYMD(monday), end: formatDateYMD(sunday) };
        }
        if (preset === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            return { start: formatDateYMD(startOfMonth), end: formatDateYMD(endOfMonth) };
        }
        return { start: '', end: '' };
    };

    const [datePreset, setDatePreset] = useState<string>('month');
    const [startDate, setStartDate] = useState(() => getPresetRange('month').start);
    const [endDate, setEndDate] = useState(() => getPresetRange('month').end);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRouteSheetId, setSelectedRouteSheetId] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await RouteSheetService.getAll({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                status: statusFilter !== 'ALL' ? statusFilter : undefined,
                search: searchTerm.trim() || undefined
            });
            setRouteSheets(data);
        } catch (err) {
            console.error('Failed to load route sheets', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [startDate, endDate, statusFilter]);

    const handleApplyDatePreset = (preset: string) => {
        setDatePreset(preset);
        const range = getPresetRange(preset);
        setStartDate(range.start);
        setEndDate(range.end);
    };

    const handleCreate = () => {
        setSelectedRouteSheetId(null);
        setIsModalOpen(true);
    };

    const handleEdit = (id: string) => {
        setSelectedRouteSheetId(id);
        setIsModalOpen(true);
    };

    const handlePrint = (id: string) => {
        window.open(`/route-sheets/${id}/print`, '_blank');
    };

    const handleDelete = async (id: string, number: string) => {
        if (!window.confirm(`Ви впевнені, що хочете видалити маршрутний лист № ${number}?`)) {
            return;
        }

        try {
            await RouteSheetService.delete(id);
            loadData();
        } catch (err: any) {
            console.error('Failed to delete route sheet', err);
            alert(err.response?.data?.message || err.message || 'Не вдалося видалити маршрутний лист');
        }
    };

    const filteredRouteSheets = useMemo(() => {
        if (!searchTerm.trim()) return routeSheets;
        const q = searchTerm.toLowerCase();
        return routeSheets.filter(rs =>
            (rs.number || '').toLowerCase().includes(q) ||
            (rs.driverName || '').toLowerCase().includes(q) ||
            (rs.comment || '').toLowerCase().includes(q)
        );
    }, [routeSheets, searchTerm]);

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg">
                        <Truck size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                            Маршрутні листи
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                            Формування та друк маршрутів доставки з накладними
                        </p>
                    </div>
                </div>

                <button
                    onClick={handleCreate}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-semibold shadow-xs"
                >
                    <Plus size={18} className="mr-1.5" />
                    Створити маршрутний лист
                </button>
            </div>

            {/* Filter Toolbar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xs border border-gray-200 dark:border-gray-700 space-y-3">
                <div className="flex flex-wrap items-center gap-3 justify-between">
                    {/* Date Presets */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-md shadow-xs border border-gray-300 dark:border-gray-600 overflow-hidden h-[38px]">
                            <button
                                type="button"
                                onClick={() => handleApplyDatePreset('today')}
                                className={`px-3 py-2 text-xs font-semibold transition-colors ${
                                    datePreset === 'today'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                Сьогодні
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApplyDatePreset('week')}
                                className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                                    datePreset === 'week'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                Тиждень
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApplyDatePreset('month')}
                                className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                                    datePreset === 'month'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                Місяць
                            </button>
                            <button
                                type="button"
                                onClick={() => handleApplyDatePreset('all')}
                                className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
                                    datePreset === 'all'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                Всі
                            </button>
                        </div>

                        {/* Date Inputs */}
                        <div className="flex items-center gap-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => {
                                    setStartDate(e.target.value);
                                    setDatePreset('custom');
                                }}
                                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1.5 text-xs h-[38px]"
                            />
                            <span className="text-gray-400 text-xs">-</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => {
                                    setEndDate(e.target.value);
                                    setDatePreset('custom');
                                }}
                                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md p-1.5 text-xs h-[38px]"
                            />
                        </div>
                    </div>

                    {/* Search & Status Filter */}
                    <div className="flex items-center gap-2 flex-1 max-w-md min-w-[200px]">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Пошук за номером, водієм, коментарем..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-xs h-[38px]"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md text-xs h-[38px] px-2"
                        >
                            <option value="ALL">Всі статуси</option>
                            <option value="SAVED">Збережено</option>
                            <option value="DRAFT">Чернетка</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table of Route Sheets */}
            <div className="bg-white dark:bg-gray-800 shadow-xs rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 font-bold uppercase text-[11px] tracking-wider">
                        <tr>
                            <th className="px-4 py-3 text-left">Номер</th>
                            <th className="px-4 py-3 text-left">Дата</th>
                            <th className="px-4 py-3 text-left">Водій / Експедитор</th>
                            <th className="px-4 py-3 text-center">Накладних</th>
                            <th className="px-4 py-3 text-right">Сума накладних</th>
                            <th className="px-4 py-3 text-right bg-yellow-50 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-200">
                                Оплата клієнтів
                            </th>
                            <th className="px-4 py-3 text-left">Примітка</th>
                            <th className="px-4 py-3 text-center">Дії</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-gray-500">
                                    Завантаження маршрутних листів...
                                </td>
                            </tr>
                        ) : filteredRouteSheets.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center text-gray-500">
                                    <div className="flex flex-col items-center">
                                        <AlertCircle size={32} className="text-gray-400 mb-2" />
                                        <span>Маршрутних листів не знайдено</span>
                                        <button
                                            onClick={handleCreate}
                                            className="mt-3 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                                        >
                                            Створити перший маршрутний лист
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredRouteSheets.map((rs) => (
                                <tr key={rs.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                        № {rs.number}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                        {rs.date ? new Date(rs.date).toLocaleDateString('uk-UA') : ''}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        {rs.driverName || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                        {rs.itemCount || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                        {Number(rs.totalAmount || 0).toFixed(2)} ₴
                                    </td>
                                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white whitespace-nowrap bg-yellow-50/50 dark:bg-yellow-950/10">
                                        {Number(rs.totalPayment || 0).toFixed(2)} ₴
                                    </td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-xs" title={rs.comment}>
                                        {rs.comment || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => handlePrint(rs.id)}
                                                className="p-1.5 text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-md"
                                                title="Друкувати маршрутний лист та накладні"
                                            >
                                                <Printer size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(rs.id)}
                                                className="p-1.5 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-md"
                                                title="Редагувати"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(rs.id, rs.number)}
                                                className="p-1.5 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 hover:bg-red-50 dark:hover:bg-gray-700 rounded-md"
                                                title="Видалити"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Route Sheet Modal for Create & Edit */}
            <RouteSheetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                routeSheetId={selectedRouteSheetId}
                onSaved={() => loadData()}
            />
        </div>
    );
}
