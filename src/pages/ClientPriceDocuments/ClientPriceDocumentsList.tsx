import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, CheckCircle, FileText, Trash2, RotateCcw } from 'lucide-react';
import { ClientPriceDocumentsService } from '../../services/clientPriceDocuments.service';
import type { ClientPriceDocument } from '../../types/clientPriceDocument';

export default function ClientPriceDocumentsList() {
    const [documents, setDocuments] = useState<ClientPriceDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const navigate = useNavigate();

    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const data = await ClientPriceDocumentsService.fetchDocuments();
            setDocuments(data);
        } catch (error) {
            console.error('Failed to load client price documents', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Ви впевнені, що хочете провести цей документ встановлення цін клієнта?')) return;
        try {
            await ClientPriceDocumentsService.applyDocument(id);
            loadDocuments();
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка проведення');
        }
    };

    const handleUnpost = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Ви впевнені, що хочете розпровести цей документ та скасувати персональні знижки?')) return;
        try {
            await ClientPriceDocumentsService.unpostDocument(id);
            loadDocuments();
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка розпроведення');
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (!confirm('Ви впевнені, що хочете видалити цей документ?')) return;
        try {
            await ClientPriceDocumentsService.deleteDocument(id);
            loadDocuments();
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка видалення');
        }
    };

    const filteredDocuments = documents.filter(doc => {
        const matchesSearch = !searchTerm || 
            doc.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.counterpartyName && doc.counterpartyName.toLowerCase().includes(searchTerm.toLowerCase()));
        
        const matchesStatus = statusFilter === 'ALL' || doc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Установка цін клієнтів</h1>
                    <p className="text-sm text-gray-500 mt-1">Реєстр документів персональних знижок для контрагентів</p>
                </div>
                <button
                    onClick={() => navigate('/price-documents/client-prices/new')}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Новий документ
                </button>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Пошук за номером або назвою клієнта..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Статус:</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        <option value="ALL">Усі документи</option>
                        <option value="DRAFT">Черновик</option>
                        <option value="APPLIED">Проведено</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm border border-gray-200 overflow-x-auto rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Номер</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Дата</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Клієнт (Контрагент)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Базовий тип ціни</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Статус</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Коментар</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Дії</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Завантаження документів...</td></tr>
                        ) : filteredDocuments.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">Документів не знайдено</td></tr>
                        ) : (
                            filteredDocuments.map((doc) => (
                                <tr 
                                    key={doc.id} 
                                    className="hover:bg-gray-50 cursor-pointer transition"
                                    onClick={() => navigate(`/price-documents/client-prices/${doc.id}`)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-indigo-600">
                                        {doc.number}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(doc.date).toLocaleDateString('uk-UA')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {doc.counterpartyName || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                                            {doc.priceTypeName || 'Не призначено'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            doc.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                        }`}>
                                            {doc.status === 'APPLIED' ? 'Проведено' : 'Черновик'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 max-w-xs truncate">
                                        {doc.comment || '—'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end space-x-3">
                                            <button 
                                                className="text-indigo-600 hover:text-indigo-900 flex items-center gap-1"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/price-documents/client-prices/${doc.id}`);
                                                }}
                                                title="Редагувати / Переглянути"
                                            >
                                                <FileText className="h-4 w-4" />
                                                <span className="hidden md:inline">Відкрити</span>
                                            </button>

                                            {doc.status === 'DRAFT' && (
                                                <button 
                                                    className="text-emerald-600 hover:text-emerald-900 flex items-center gap-1"
                                                    onClick={(e) => handleApply(e, doc.id)}
                                                    title="Провести документ"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                    <span className="hidden md:inline">Провести</span>
                                                </button>
                                            )}

                                            {doc.status === 'APPLIED' && (
                                                <button 
                                                    className="text-amber-600 hover:text-amber-900 flex items-center gap-1"
                                                    onClick={(e) => handleUnpost(e, doc.id)}
                                                    title="Розпровести документ"
                                                >
                                                    <RotateCcw className="h-4 w-4" />
                                                    <span className="hidden md:inline">Розпровести</span>
                                                </button>
                                            )}

                                            {doc.status === 'DRAFT' && (
                                                <button 
                                                    className="text-rose-600 hover:text-rose-900 flex items-center gap-1"
                                                    onClick={(e) => handleDelete(e, doc.id)}
                                                    title="Видалити документ"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
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
