import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { GoodsReceiptService } from '../../services/goodsReceipt.service';
import { ProductsService } from '../../services/products.service';
import { OrganizationService } from '../../services/organization.service';
import { CounterpartyService } from '../../services/counterparty.service';
import { PriceTypesService } from '../../services/priceTypes.service';
import type { GoodsReceipt, GoodsReceiptItem } from '../../types/goodsReceipt';
import type { Product } from '../../types/product';
import type { Warehouse } from '../../types/organization';
import type { Counterparty } from '../../types/counterparty';
import type { PriceType } from '../../types/priceType';

export default function GoodsReceiptEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const isNew = !id || id === 'new';

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Data sources
    const [products, setProducts] = useState<Product[]>([]);
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [providers, setProviders] = useState<Counterparty[]>([]);
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

    // Form State
    const [doc, setDoc] = useState<Partial<GoodsReceipt>>({
        date: new Date().toISOString(),
        status: 'SAVED',
        items: []
    });

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load types
            const [prodsData, whs, cnts, pts] = await Promise.all([
                ProductsService.fetchProducts(), 
                OrganizationService.getWarehouses(),
                CounterpartyService.getAll(),
                PriceTypesService.fetchPriceTypes()
            ]);
            setProducts(prodsData.products);
            setWarehouses(whs);
            setProviders(cnts);
            setPriceTypes(pts);

            if (!isNew && id) {
                const existing = await GoodsReceiptService.getById(id);
                setDoc(existing);
            } else {
                // Set default number?
                setDoc(prev => ({ ...prev, number: `GR-${Date.now().toString().slice(-6)}` }));
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleHeaderChange = (field: keyof GoodsReceipt, value: any) => {
        setDoc(prev => ({ ...prev, [field]: value }));
    };

    const recalculatePrices = (priceTypeId: string, currentItems: GoodsReceiptItem[]) => {
        const type = priceTypes.find(t => t.id === priceTypeId);
        if (!type) return currentItems;

        return currentItems.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product || !product.prices) return item;
            
            const newPrice = Number(product.prices[type.slug]) || 0;
            return {
                ...item,
                price: newPrice,
                total: Number(item.quantity || 0) * newPrice
            };
        });
    };

    const handlePriceTypeChange = (newTypeId: string) => {
        setDoc(prev => {
            const newItems = recalculatePrices(newTypeId, prev.items || []);
            return { ...prev, priceTypeId: newTypeId, items: newItems };
        });
    };

    const handleItemChange = (index: number, field: keyof GoodsReceiptItem, value: any) => {
        const newItems = [...(doc.items || [])];
        const item = { ...newItems[index], [field]: value };
        
        // Auto-set price if Product changed and PriceType selected
        if (field === 'productId') {
             const product = products.find(p => p.id === value);
             if (product && doc.priceTypeId) {
                 const type = priceTypes.find(t => t.id === doc.priceTypeId);
                 if (type && product.prices) {
                     item.price = Number(product.prices[type.slug]) || 0;
                 }
             }
        }

        // Recalculate total always
        item.total = Number(item.quantity || 0) * Number(item.price || 0);
        
        newItems[index] = item;
        setDoc(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setDoc(prev => ({
            ...prev,
            items: [
                ...(prev.items || []),
                {
                    id: crypto.randomUUID(), // Temp ID
                    productId: '',
                    quantity: 1,
                    price: 0,
                    total: 0
                } as GoodsReceiptItem
            ]
        }));
    };

    const removeItem = (index: number) => {
        const newItems = [...(doc.items || [])];
        newItems.splice(index, 1);
        setDoc(prev => ({ ...prev, items: newItems }));
    };

    const save = async (post: boolean = false) => {
        if (!doc.warehouseId || !doc.providerId) {
            alert('Оберіть склад та постачальника');
            return;
        }
        setSaving(true);
        try {
            let savedDoc;
            if (isNew) {
                savedDoc = await GoodsReceiptService.create(doc);
            } else {
                if (id) savedDoc = await GoodsReceiptService.update(id, doc);
            }

            if (savedDoc && post) {
                savedDoc = await GoodsReceiptService.post(savedDoc.id);
            }

            setDoc(savedDoc!);
            if (isNew) navigate(`/goods-receipt/${savedDoc!.id}`, { replace: true });
            
            alert(post ? 'Документ проведено!' : 'Документ збережено!');
        } catch (error: any) {
            console.error('Failed to save', error);
            alert('Помилка збереження: ' + (error.response?.data?.error || error.message));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Завантаження...</div>;

    const isPosted = doc.status === 'POSTED';
    const totalAmount = doc.items?.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center">
                    <button onClick={() => navigate('/goods-receipt')} className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold dark:text-white">
                        {isNew ? 'Нове Поступлення' : `Поступлення ${doc.number}`}
                    </h1>
                    <span className={`ml-4 px-3 py-1 text-sm font-semibold rounded-full 
                        ${doc.status === 'POSTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {doc.status === 'POSTED' ? 'Проведено' : 'Збережено'}
                    </span>
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    {!isPosted && (
                        <>
                            <button
                                onClick={() => save(false)}
                                disabled={saving}
                                className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
                            >
                                <Save className="mr-2" size={18} />
                                <span className="hidden sm:inline">Зберегти</span>
                            </button>
                            <button
                                onClick={() => save(true)}
                                disabled={saving}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                                <CheckCircle className="mr-2" size={18} />
                                <span className="hidden sm:inline">Провести</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Document Header Form */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Номер</label>
                    <input
                        type="text"
                        value={doc.number || ''}
                        onChange={(e) => handleHeaderChange('number', e.target.value)}
                        disabled={isPosted}
                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Дата</label>
                    <input
                        type="datetime-local"
                        value={doc.date ? doc.date.slice(0, 16) : ''}
                        onChange={(e) => handleHeaderChange('date', e.target.value)}
                        disabled={isPosted}
                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Постачальник</label>
                    <select
                        value={doc.providerId || ''}
                        onChange={(e) => handleHeaderChange('providerId', e.target.value)}
                        disabled={isPosted}
                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">Оберіть постачальника</option>
                        {providers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Склад</label>
                    <select
                        value={doc.warehouseId || ''}
                        onChange={(e) => handleHeaderChange('warehouseId', e.target.value)}
                        disabled={isPosted}
                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">Оберіть склад</option>
                        {warehouses.map(w => (
                            <option key={w.id} value={w.id}>{w.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Тип Ціни</label>
                    <select
                        value={doc.priceTypeId || ''}
                        onChange={(e) => handlePriceTypeChange(e.target.value)}
                        disabled={isPosted}
                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">Без авто-ціни</option>
                        {priceTypes.map(pt => (
                            <option key={pt.id} value={pt.id}>{pt.name}</option>
                        ))}
                    </select>
                </div>
                <div className="col-span-full">
                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Коментар</label>
                    <textarea
                        value={doc.comment || ''}
                        onChange={(e) => handleHeaderChange('comment', e.target.value)}
                        disabled={isPosted}
                        rows={2}
                        className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-4 py-3 text-left w-10">#</th>
                                <th className="px-4 py-3 text-left min-w-[200px]">Товар</th>
                                <th className="px-4 py-3 text-right w-32 min-w-[100px]">Кількість</th>
                                <th className="px-4 py-3 text-right w-32 min-w-[100px]">Ціна</th>
                                <th className="px-4 py-3 text-right w-32 min-w-[100px]">Сума</th>
                                <th className="px-4 py-3 w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {doc.items?.map((item, index) => (
                                <tr key={index}>
                                    <td className="px-4 py-2 text-center text-gray-500">{index + 1}</td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={item.productId}
                                            onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                                            disabled={isPosted}
                                            className="w-full rounded border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        >
                                            <option value="">Оберіть товар</option>
                                            {products.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.001"
                                            value={item.quantity}
                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                            disabled={isPosted}
                                            className="w-full rounded border-gray-300 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={item.price}
                                            onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                            disabled={isPosted}
                                            className="w-full rounded border-gray-300 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-right font-medium dark:text-white">
                                        {Number(item.total).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        {!isPosted && (
                                            <button onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-50 dark:bg-gray-900 font-bold">
                            <tr>
                                <td colSpan={4} className="px-4 py-3 text-right dark:text-white">Всього:</td>
                                <td className="px-4 py-3 text-right dark:text-white">{totalAmount.toFixed(2)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
                {!isPosted && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={addItem}
                            className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                            <Plus size={18} className="mr-1" />
                            Додати рядок
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
