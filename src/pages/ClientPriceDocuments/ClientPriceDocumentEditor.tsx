import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, RotateCcw, Search, Percent, UserCheck, Copy } from 'lucide-react';
import { ClientPriceDocumentsService } from '../../services/clientPriceDocuments.service';
import { CounterpartyService } from '../../services/counterparty.service';
import type { ClientPriceDocumentItem } from '../../types/clientPriceDocument';

interface CounterpartyOption {
    id: string;
    name: string;
    contactPerson?: string;
    priceTypeName?: string;
}

const deduplicateItems = (rawItems: ClientPriceDocumentItem[]): ClientPriceDocumentItem[] => {
    const map = new Map<string, ClientPriceDocumentItem>();
    (rawItems || []).forEach(item => {
        if (item && item.productId) {
            map.set(item.productId, item);
        }
    });
    return Array.from(map.values());
};

const calculateFinalPrice = (basePrice: number, discountPercent: number, roundingMethod: 'UP' | 'DOWN' = 'UP'): number => {
    const discountFactor = (100 - (discountPercent || 0)) / 100;
    const raw = (basePrice || 0) * discountFactor;
    return roundingMethod === 'DOWN'
        ? Math.floor(raw * 100) / 100
        : Math.ceil(raw * 100) / 100;
};

export default function ClientPriceDocumentEditor() {
    const { id } = useParams<{ id: string }>();
    const isNew = !id || id === 'new';
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // Header state
    const [docNumber, setDocNumber] = useState<string>('');
    const [docDate, setDocDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [counterpartyId, setCounterpartyId] = useState<string>('');
    const [counterparties, setCounterparties] = useState<CounterpartyOption[]>([]);
    const [priceTypeName, setPriceTypeName] = useState<string>('');
    const [roundingMethod, setRoundingMethod] = useState<'UP' | 'DOWN'>('UP');
    const [status, setStatus] = useState<'DRAFT' | 'APPLIED'>('DRAFT');
    const [comment, setComment] = useState<string>('');

    // Items & Filtering state
    const [items, setItems] = useState<ClientPriceDocumentItem[]>([]);
    const [productSearch, setProductSearch] = useState<string>('');
    const [bulkDiscount, setBulkDiscount] = useState<string>('');

    // Counterparty search combobox
    const [cpSearch, setCpSearch] = useState<string>('');
    const [isCpDropdownOpen, setIsCpDropdownOpen] = useState<boolean>(false);

    useEffect(() => {
        loadCounterparties();
        if (!isNew && id) {
            loadExistingDocument(id);
        }
    }, [id]);

    const loadCounterparties = async () => {
        try {
            const data = await CounterpartyService.getAll();
            setCounterparties(data);
        } catch (error) {
            console.error('Failed to load counterparties', error);
        }
    };

    const loadExistingDocument = async (docId: string) => {
        setLoading(true);
        try {
            const doc = await ClientPriceDocumentsService.fetchDocument(docId);
            setDocNumber(doc.number);
            setDocDate(doc.date ? new Date(doc.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
            setCounterpartyId(doc.counterpartyId);
            setPriceTypeName(doc.priceTypeName || 'Не призначено');
            setRoundingMethod(doc.roundingMethod || 'UP');
            setStatus(doc.status);
            setComment(doc.comment || '');
            setItems(deduplicateItems(doc.items || []));

            if (doc.counterpartyName) {
                setCpSearch(doc.counterpartyName);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка завантаження документа');
            navigate('/price-documents/client-prices');
        } finally {
            setLoading(false);
        }
    };

    // When selecting a new counterparty in creation mode
    const handleSelectCounterparty = async (cp: CounterpartyOption) => {
        setCounterpartyId(cp.id);
        setCpSearch(cp.name);
        setIsCpDropdownOpen(false);

        if (isNew) {
            setLoading(true);
            try {
                const prepared = await ClientPriceDocumentsService.prepareItems(cp.id);
                setPriceTypeName(prepared.priceTypeName || 'Не призначено');
                const preparedItems = (prepared.items || []).map((item: ClientPriceDocumentItem) => ({
                    ...item,
                    finalPrice: calculateFinalPrice(item.basePrice, item.discountPercent || 0, roundingMethod)
                }));
                setItems(deduplicateItems(preparedItems));
            } catch (error: any) {
                alert(error.response?.data?.error || error.message || 'Помилка завантаження товарів');
            } finally {
                setLoading(false);
            }
        }
    };

    // Handle rounding method change and update all item prices
    const handleRoundingMethodChange = (method: 'UP' | 'DOWN') => {
        setRoundingMethod(method);
        setItems(prev => prev.map(item => ({
            ...item,
            finalPrice: calculateFinalPrice(item.basePrice, item.discountPercent || 0, method)
        })));
    };

    // Update discount % for a specific item
    const handleItemDiscountChange = (productId: string, valStr: string) => {
        const val = Math.min(100, Math.max(0, parseFloat(valStr) || 0));
        setItems(prev => prev.map(item => {
            if (item.productId === productId) {
                const finalPrice = calculateFinalPrice(item.basePrice, val, roundingMethod);
                return {
                    ...item,
                    discountPercent: val,
                    finalPrice
                };
            }
            return item;
        }));
    };

    // Bulk set discount for all items
    const handleApplyBulkDiscount = () => {
        const val = Math.min(100, Math.max(0, parseFloat(bulkDiscount) || 0));
        if (isNaN(val)) return;

        setItems(prev => prev.map(item => {
            const finalPrice = calculateFinalPrice(item.basePrice, val, roundingMethod);
            return {
                ...item,
                discountPercent: val,
                finalPrice
            };
        }));
    };

    // Save as DRAFT
    const handleSaveDraft = async () => {
        if (!counterpartyId) {
            alert('Будь ласка, виберіть клієнта');
            return;
        }

        setSaving(true);
        try {
            const payload = {
                counterpartyId,
                date: docDate,
                comment,
                roundingMethod,
                items
            };

            if (isNew) {
                const created = await ClientPriceDocumentsService.createDocument(payload);
                alert('Документ збережено як черновик');
                navigate(`/price-documents/client-prices/${created.id}`);
            } else if (id) {
                await ClientPriceDocumentsService.updateDocument(id, payload);
                alert('Документ успішно оновлено');
                loadExistingDocument(id);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка збереження');
        } finally {
            setSaving(false);
        }
    };

    // Save and Apply (Post)
    const handleSaveAndApply = async () => {
        if (!counterpartyId) {
            alert('Будь ласка, виберіть клієнта');
            return;
        }

        if (!confirm('Ви впевнені, що хочете провести документ та застосувати знижки в системі?')) return;

        setSaving(true);
        try {
            let targetId = id;
            const payload = {
                counterpartyId,
                date: docDate,
                comment,
                roundingMethod,
                items
            };

            if (isNew) {
                const created = await ClientPriceDocumentsService.createDocument(payload);
                targetId = created.id;
            } else if (id) {
                await ClientPriceDocumentsService.updateDocument(id, payload);
            }

            if (targetId) {
                await ClientPriceDocumentsService.applyDocument(targetId);
                alert('Документ успішно проведено!');
                navigate(`/price-documents/client-prices/${targetId}`);
            }
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка проведення');
        } finally {
            setSaving(false);
        }
    };

    // Unpost document
    const handleUnpost = async () => {
        if (!id || isNew) return;
        if (!confirm('Ви впевнені, що хочете розпровести документ та скасувати персональні знижки?')) return;

        setSaving(true);
        try {
            await ClientPriceDocumentsService.unpostDocument(id);
            alert('Документ успішно розпроведено');
            loadExistingDocument(id);
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка розпроведення');
        } finally {
            setSaving(false);
        }
    };

    // Copy document
    const handleCopy = async () => {
        if (!id || isNew) return;
        if (!confirm('Ви впевнені, що хочете скопіювати цей документ встановлення цін?')) return;
        setSaving(true);
        try {
            const newDoc = await ClientPriceDocumentsService.copyDocument(id);
            alert('Документ успішно скопійовано');
            navigate(`/price-documents/client-prices/${newDoc.id}`);
        } catch (error: any) {
            alert(error.response?.data?.error || error.message || 'Помилка копіювання документа');
        } finally {
            setSaving(false);
        }
    };

    // Filtered items by search term
    const filteredItems = useMemo(() => {
        if (!productSearch.trim()) return items;
        const term = productSearch.toLowerCase();
        return items.filter(item => 
            (item.productCode && item.productCode.toLowerCase().includes(term)) ||
            (item.productName && item.productName.toLowerCase().includes(term))
        );
    }, [items, productSearch]);

    // Filtered counterparties for combobox
    const filteredCounterparties = useMemo(() => {
        if (!cpSearch.trim()) return counterparties.slice(0, 30);
        const term = cpSearch.toLowerCase();
        return counterparties.filter(cp => 
            cp.name.toLowerCase().includes(term) || 
            (cp.contactPerson && cp.contactPerson.toLowerCase().includes(term))
        ).slice(0, 30);
    }, [counterparties, cpSearch]);

    const isReadOnly = status === 'APPLIED';

    return (
        <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/price-documents/client-prices')}
                        className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {isNew ? 'Новий документ установки цін клієнта' : `Документ ${docNumber}`}
                            </h1>
                            {!isNew && (
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                    status === 'APPLIED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                    {status === 'APPLIED' ? 'Проведено' : 'Черновик'}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Персональні знижки для контрагента від базового типу цін</p>
                    </div>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => navigate('/price-documents/client-prices')}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                        Назад
                    </button>

                    {!isReadOnly && (
                        <>
                            <button
                                onClick={handleSaveDraft}
                                disabled={saving || loading}
                                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition disabled:opacity-50"
                            >
                                <Save className="h-4 w-4 mr-2 text-gray-500" />
                                Зберегти
                            </button>

                            <button
                                onClick={handleSaveAndApply}
                                disabled={saving || loading}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Провести
                            </button>
                        </>
                    )}

                    {!isNew && (
                        <button
                            onClick={handleCopy}
                            disabled={saving || loading}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition disabled:opacity-50"
                        >
                            <Copy className="h-4 w-4 mr-2 text-gray-500" />
                            Скопіювати
                        </button>
                    )}

                    {isReadOnly && (
                        <button
                            onClick={handleUnpost}
                            disabled={saving || loading}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 transition disabled:opacity-50"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Розпровести
                        </button>
                    )}
                </div>
            </div>

            {/* Document Details Form */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Client Search Dropdown */}
                <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Клієнт (Контрагент) *
                    </label>
                    <div className="relative">
                        <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Оберіть клієнта..."
                            disabled={!isNew || isReadOnly}
                            value={cpSearch}
                            onChange={(e) => {
                                setCpSearch(e.target.value);
                                setIsCpDropdownOpen(true);
                            }}
                            onFocus={() => setIsCpDropdownOpen(true)}
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                        />
                    </div>

                    {isCpDropdownOpen && isNew && (
                        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredCounterparties.length === 0 ? (
                                <div className="p-3 text-sm text-gray-500 text-center">Клієнтів не знайдено</div>
                            ) : (
                                filteredCounterparties.map(cp => (
                                    <div
                                        key={cp.id}
                                        onClick={() => handleSelectCounterparty(cp)}
                                        className="p-3 text-sm hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0"
                                    >
                                        <div className="font-medium text-gray-900">{cp.name}</div>
                                        {cp.priceTypeName && (
                                            <div className="text-xs text-indigo-600 mt-0.5">Тип ціни: {cp.priceTypeName}</div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Base Price Type (Readonly) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Призначений тип цін
                    </label>
                    <input
                        type="text"
                        readOnly
                        value={priceTypeName || 'Оберіть клієнта'}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-semibold"
                    />
                </div>

                {/* Rounding Method */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Метод округлення цін
                    </label>
                    <select
                        disabled={isReadOnly}
                        value={roundingMethod}
                        onChange={(e) => handleRoundingMethodChange(e.target.value as 'UP' | 'DOWN')}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100 font-medium"
                    >
                        <option value="UP">До більшого (за замовчуванням)</option>
                        <option value="DOWN">До меншого</option>
                    </select>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Дата документа
                    </label>
                    <input
                        type="date"
                        disabled={isReadOnly}
                        value={docDate}
                        onChange={(e) => setDocDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                </div>

                {/* Comment */}
                <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Коментар
                    </label>
                    <input
                        type="text"
                        disabled={isReadOnly}
                        placeholder="Додаткова інформація до документа..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                    />
                </div>
            </div>

            {/* Table Header Controls */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Product Search */}
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Пошук товару в таблиці за назвою..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Group Discount Setter */}
                {!isReadOnly && (
                    <div className="flex items-center gap-2 w-full md:w-auto bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                        <Percent className="h-4 w-4 text-indigo-600 ml-1" />
                        <span className="text-xs font-semibold text-indigo-900 whitespace-nowrap">Знижка для всіх:</span>
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            placeholder="%"
                            value={bulkDiscount}
                            onChange={(e) => setBulkDiscount(e.target.value)}
                            className="w-20 px-2 py-1 border border-indigo-300 rounded text-sm text-center font-bold focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="button"
                            onClick={handleApplyBulkDiscount}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium transition whitespace-nowrap"
                        >
                            Застосувати до всіх
                        </button>
                    </div>
                )}
            </div>

            {/* Products Table */}
            <div className="bg-white shadow-sm border border-gray-200 overflow-x-auto rounded-xl">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Найменування товару</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Вхід (грн)</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Базова ціна (грн)</th>
                            <th className="px-4 py-3 text-center text-xs font-semibold text-indigo-600 uppercase tracking-wider w-36">Дод. знижка (%)</th>
                            <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-700 uppercase tracking-wider w-36">Кінцева ціна (грн)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Підготовка товарів...</td></tr>
                        ) : !counterpartyId ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Будь ласка, оберіть клієнта вище</td></tr>
                        ) : filteredItems.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Товарів не знайдено</td></tr>
                        ) : (
                            filteredItems.map((item) => (
                                <tr key={item.productId} className="hover:bg-gray-50 transition">
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {item.productName}
                                        {item.productUnit && <span className="text-xs text-gray-400 font-normal ml-1">({item.productUnit})</span>}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-500 font-mono">
                                        {item.costPrice ? item.costPrice.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right text-gray-700 font-medium font-mono">
                                        {item.basePrice ? item.basePrice.toFixed(2) : '0.00'}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            max="100"
                                            disabled={isReadOnly}
                                            value={item.discountPercent || ''}
                                            onChange={(e) => handleItemDiscountChange(item.productId, e.target.value)}
                                            className="w-24 px-2 py-1 border border-indigo-200 rounded text-center text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50"
                                            placeholder="0"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-right font-bold text-emerald-700 font-mono">
                                        {item.finalPrice ? item.finalPrice.toFixed(2) : '0.00'}
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
