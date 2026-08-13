import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Database, Download, Trash2, Plus, RefreshCw, HardDrive, Clock, ShieldAlert } from 'lucide-react';
import { BackupService, type BackupFile } from '../../services/backup.service';

export default function DatabaseBackup() {
  const { t } = useTranslation();
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await BackupService.getBackups();
      setBackups(data);
    } catch (error) {
      console.error('Failed to load backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setCreating(true);
    try {
      await BackupService.createBackup();
      await loadBackups();
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert(t('common.error', 'Failed to create backup'));
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename: string) => {
    setActionLoading(filename);
    try {
      await BackupService.downloadBackup(filename);
    } catch (error) {
      console.error('Failed to download backup:', error);
      alert(t('common.error', 'Failed to download backup'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(t('common.confirmDelete', `Are you sure you want to delete backup ${filename}?`))) {
      return;
    }

    setActionLoading(filename);
    try {
      await BackupService.deleteBackup(filename);
      setBackups(prev => prev.filter(b => b.filename !== filename));
    } catch (error) {
      console.error('Failed to delete backup:', error);
      alert(t('common.error', 'Failed to delete backup'));
    } finally {
      setActionLoading(null);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const totalSize = backups.reduce((acc, b) => acc + b.size, 0);
  const lastBackup = backups.length > 0 ? backups[0].createdAt : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-6 shadow rounded-lg gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Database className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
            {t('admin.backups', 'База даних & Резервні копії')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Автоматичне щоденне копіювання та ручне управління дампами PostgreSQL
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadBackups}
            disabled={loading || creating}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {t('common.refresh', 'Оновити')}
          </button>

          <button
            onClick={handleCreateBackup}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors text-sm font-medium disabled:opacity-50"
          >
            {creating ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            {creating ? 'Створення бекапу...' : 'Створити резервну копію'}
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center gap-4">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <Database size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Всього копій</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{backups.length}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center gap-4">
          <div className="p-3 bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 rounded-lg">
            <HardDrive size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Загальний розмір</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{formatSize(totalSize)}</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Останній бекап</div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              {lastBackup ? new Date(lastBackup).toLocaleString() : 'Відсутній'}
            </div>
          </div>
        </div>
      </div>

      {/* Info Notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex gap-3 items-start">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <p className="font-semibold">Правило збереження бекапів (Retention Policy):</p>
          <p>
            Автоматичний розклад здійснює створення копії щодня о 03:00. Зберігаються останні 7 дампів, старіші видаляються автоматично.
          </p>
        </div>
      </div>

      {/* Backups List Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Назва файлу
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Дата створення
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Розмір
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Дії
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  Завантаження списку бекапів...
                </td>
              </tr>
            ) : backups.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  Резервних копій поки немає. Натисніть "Створити резервну копію", щоб згенерувати перший дамп.
                </td>
              </tr>
            ) : (
              backups.map((backup) => (
                <tr key={backup.filename} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white font-mono">
                    {backup.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                    {new Date(backup.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-mono">
                    {formatSize(backup.size)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => handleDownload(backup.filename)}
                        disabled={actionLoading === backup.filename}
                        className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 text-xs font-semibold"
                        title="Завантажити"
                      >
                        <Download size={16} />
                        Скачати
                      </button>

                      <button
                        onClick={() => handleDelete(backup.filename)}
                        disabled={actionLoading === backup.filename}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1 text-xs font-semibold"
                        title="Видалити"
                      >
                        <Trash2 size={16} />
                        Видалити
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
