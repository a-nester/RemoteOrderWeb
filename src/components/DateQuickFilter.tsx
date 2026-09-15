export const getPresetDateRange = (preset: string): { start: string; end: string } | null => {
  const now = new Date();
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  if (preset === 'today') {
    const todayStr = formatDate(now);
    return { start: todayStr, end: todayStr };
  }
  if (preset === 'week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return { start: formatDate(monday), end: formatDate(sunday) };
  }
  if (preset === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { start: formatDate(startOfMonth), end: formatDate(endOfMonth) };
  }
  if (preset === 'all') {
    return { start: '', end: '' };
  }
  return null;
};

interface DateQuickFilterProps {
  datePreset: string;
  startDate: string;
  endDate: string;
  onPresetChange: (preset: string, start: string, end: string) => void;
  onDateChange: (start: string, end: string) => void;
  className?: string;
}

export default function DateQuickFilter({
  datePreset,
  startDate,
  endDate,
  onPresetChange,
  onDateChange,
  className = '',
}: DateQuickFilterProps) {
  const handleApplyPreset = (preset: string) => {
    const range = getPresetDateRange(preset);
    const start = range ? range.start : '';
    const end = range ? range.end : '';
    onPresetChange(preset, start, end);
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Quick Date Presets */}
      <div className="inline-flex rounded-md shadow-sm border border-gray-300 dark:border-gray-600 overflow-hidden h-[42px]">
        <button
          type="button"
          onClick={() => handleApplyPreset('today')}
          className={`px-3 py-2 text-xs font-semibold transition-colors ${
            datePreset === 'today'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          Сьогодні
        </button>
        <button
          type="button"
          onClick={() => handleApplyPreset('week')}
          className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
            datePreset === 'week'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          Тиждень
        </button>
        <button
          type="button"
          onClick={() => handleApplyPreset('month')}
          className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
            datePreset === 'month'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
          }`}
        >
          Поточний місяць
        </button>
        <button
          type="button"
          onClick={() => handleApplyPreset('all')}
          className={`px-3 py-2 text-xs font-semibold border-l border-gray-300 dark:border-gray-600 transition-colors ${
            datePreset === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600'
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
          onChange={(e) => onDateChange(e.target.value, endDate)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px] text-xs"
        />
        <span className="text-gray-500 text-xs">-</span>
        <input
          type="date"
          value={endDate}
          onChange={(e) => onDateChange(startDate, e.target.value)}
          className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 p-2 h-[42px] text-xs"
        />
      </div>
    </div>
  );
}
