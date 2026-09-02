import { useState, useEffect } from 'react';
import { Plus, Eye, Trash2, CheckCircle, RefreshCw, ArrowRightLeft, ArrowRight } from 'lucide-react';
import { StockTransferService } from '../../services/stockTransfer.service';
import type { StockTransferDocument } from '../../services/stockTransfer.service';
import { OrganizationService } from '../../services/organization.service';
import type { Warehouse } from '../../types/organization';
import StockTransferModal from './StockTransferModal';

export default function StockTransferList() {
  const [documents, setDocuments] = useState<StockTransferDocument[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedFromWhId, setSelectedFromWhId] = useState<string>('');
  const [selectedToWhId, setSelectedToWhId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);

  useEffect(() => {
    loadWarehouses();
    loadDocuments();
  }, [selectedFromWhId, selectedToWhId, selectedStatus]);

  const loadWarehouses = async () => {
    try {
      const data = await OrganizationService.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await StockTransferService.getAll({
        fromWarehouseId: selectedFromWhId,
        toWarehouseId: selectedToWhId,
        status: selectedStatus,
      });
      setDocuments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingDocId(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (id: string) => {
    setEditingDocId(id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Ви впевнені, що хочете видалити цей документ переміщення?')) return;
    try {
      await StockTransferService.deleteDocument(id);
      loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Помилка видалення');
    }
  };

  const handlePost = async (id: string) => {
    if (!window.confirm('Провести переміщення товарів? Товари будуть списані зі склада-відправника та зараховані на склад-отримувач.')) return;
    try {
      await StockTransferService.postDocument(id);
      loadDocuments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Помилка проведення');
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="text-indigo-600" />
            Переміщення товарів між складами
          </h1>
          <p className="text-sm text-gray-500 mt-1">Журнал документів внутрішнього переміщення товарів між складами</p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Нове переміщення
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Звідки (Відправник)</label>
          <select
            value={selectedFromWhId}
            onChange={(e) => setSelectedFromWhId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="">Усі склади</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Куди (Отримувач)</label>
          <select
            value={selectedToWhId}
            onChange={(e) => setSelectedToWhId(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="">Усі склади</option>
            {warehouses.map((wh) => (
              <option key={wh.id} value={wh.id}>
                {wh.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Статус</label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
          >
            <option value="">Усі статуси</option>
            <option value="DRAFT">Чернетка</option>
            <option value="POSTED">Проведено</option>
          </select>
        </div>

        <button
          onClick={loadDocuments}
          className="mt-5 p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg transition-colors text-gray-600 dark:text-gray-200"
          title="Оновити"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800/80">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Номер</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Дата</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Маршрут (Звідки → Куди)</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Сума переміщення</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Дії</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
              {documents.map((doc, idx) => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">#{doc.number}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{new Date(doc.date).toLocaleString('uk-UA')}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    <div className="flex items-center gap-2">
                      <span>{doc.fromWarehouseName}</span>
                      <ArrowRight size={14} className="text-gray-400" />
                      <span className="font-bold text-blue-600 dark:text-blue-400">{doc.toWarehouseName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        doc.status === 'POSTED'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                      }`}
                    >
                      {doc.status === 'POSTED' ? 'Проведено' : 'Чернетка'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white text-right">
                    {Number(doc.totalAmount || 0).toFixed(2)} ₴
                  </td>
                  <td className="px-4 py-3 text-sm text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleOpenEditModal(doc.id!)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Переглянути/Редагувати/Друк"
                      >
                        <Eye size={18} />
                      </button>
                      {doc.status !== 'POSTED' && (
                        <>
                          <button
                            onClick={() => handlePost(doc.id!)}
                            className="text-green-600 hover:text-green-800 p-1"
                            title="Провести"
                          >
                            <CheckCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id!)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Видалити"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {documents.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Документів переміщення не знайдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      <StockTransferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        documentId={editingDocId}
        onSuccess={loadDocuments}
      />
    </div>
  );
}
