
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save, Plus } from 'lucide-react';
import { CounterpartyService } from '../services/counterparty.service';
import { ProductsService } from '../services/products.service';
import { PriceTypesService } from '../services/priceTypes.service';
import type { OrderItem, Order } from '../types/order';
import { OrderStatus } from '../types/order';
import type { Counterparty } from '../types/counterparty';
import type { Product } from '../types/product';
import type { PriceType } from '../types/priceType';
import ProductSelector from './ProductSelector';
import OrderItemsTable from './OrderItemsTable';

interface OrderFormProps {
    initialData?: Order;
    onSubmit: (data: any) => Promise<void>;
    saving: boolean;
    title: string;
}

export default function OrderForm({ initialData, onSubmit, saving, title }: OrderFormProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [loading, setLoading] = useState(true);
    
    // Data
    const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

    // Form State
    const [date, setDate] = useState(initialData?.date || new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<OrderStatus>(initialData?.status || OrderStatus.NEW);
    const [counterpartyId, setCounterpartyId] = useState<string>(initialData?.counterpartyId || '');
    const [comment, setComment] = useState(initialData?.comment || '');
    const [items, setItems] = useState<OrderItem[]>(Array.isArray(initialData?.items) ? initialData.items : []);
    
    // UI State
    const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    // Update form when initialData changes (for Edit mode)
    // Update form when initialData changes (for Edit mode)
    // Update form when initialData changes (for Edit mode)
    // Update form when initialData or products changes (to enrich items)
    useEffect(() => {
        if (initialData) {
            try {
                // Safe date parsing
                let dateStr = new Date().toISOString().split('T')[0];
                if (initialData.date) {
                    const d = new Date(initialData.date);
                    if (!isNaN(d.getTime())) {
                        dateStr = d.toISOString().split('T')[0];
                    }
                }
                setDate(dateStr);
                
                setStatus(initialData.status || OrderStatus.NEW);
                setCounterpartyId(initialData.counterpartyId || '');
                setComment(initialData.comment || '');
                
                // Safe items parsing with enrichment
                const rawItems = Array.isArray(initialData.items) ? initialData.items : [];
                const safeItems = rawItems.map((item: any) => {
                    const productId = item.productId || item.id; // Fallback
                    let productName = item.productName || item.name || '';
                    
                    // Try to find name in products list if missing
                    if (!productName && products.length > 0 && productId) {
                         const foundProduct = products.find(p => p.id === productId);
                         if (foundProduct) productName = foundProduct.name;
                    }

                    return {
                        ...item,
                        productId,
                        productName,
                        quantity: Number(item.quantity ?? item.count ?? 0),
                        price: Number(item.price ?? 0),
                        total: Number(item.total ?? 0) || (Number(item.quantity ?? item.count ?? 0) * Number(item.price ?? 0)) || 0
                    };
                });
                setItems(safeItems);
            } catch (e) {
                console.error("Error setting initial data", e);
            }
        }
    }, [initialData, products]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cpData, prodData, ptData] = await Promise.all([
                CounterpartyService.getAll(),
                ProductsService.fetchProducts(),
                PriceTypesService.fetchPriceTypes()
            ]);
            setCounterparties(cpData);
            setProducts(prodData.products);
            setPriceTypes(ptData);
        } catch (error) {
            console.error("Failed to load data", error);
            alert(t('common.error', 'Failed to load data'));
        } finally {
            setLoading(false);
        }
    };

    // Derived State
    const selectedCounterparty = useMemo(() => 
        counterparties.find(c => c.id === counterpartyId), 
    [counterparties, counterpartyId]);

    const currency = useMemo(() => {
        if (!selectedCounterparty?.priceTypeId) return 'UAH';
        const pt = priceTypes.find(p => p.id === selectedCounterparty.priceTypeId);
        return pt?.currency || 'UAH';
    }, [selectedCounterparty, priceTypes]);

    const priceSlug = useMemo(() => {
        if (!selectedCounterparty?.priceTypeId) return 'standard';
        const pt = priceTypes.find(p => p.id === selectedCounterparty.priceTypeId);
        return pt?.slug || 'standard';
    }, [selectedCounterparty, priceTypes]);

    const totalAmount = useMemo(() => 
        items.reduce((sum, item) => sum + (Number(item.total) || 0), 0),
    [items]);

    // Handlers
    const handleAddProduct = (product: Product) => {
        // Determine price
        let price = 0;
        if (product.prices && product.prices[priceSlug]) {
            price = Number(product.prices[priceSlug]);
        } else if (product.prices && product.prices['standard']) {
            price = Number(product.prices['standard']);
        }

        const newItem: OrderItem = {
            id: crypto.randomUUID(),
            productId: product.id,
            productName: product.name,
            quantity: 1,
            price: price,
            unit: product.unit,
            total: price * 1
        };

        setItems(prev => [...prev, newItem]);
        setIsProductSelectorOpen(false);
    };

    const handleUpdateItem = (id: string, updates: Partial<OrderItem>) => {
        setItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updatedItem = { ...item, ...updates };
            // Recalculate total if quantity or price changed
            if (updates.quantity !== undefined || updates.price !== undefined) {
                updatedItem.total = updatedItem.quantity * updatedItem.price;
            }
            return updatedItem;
        }));
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(item => item.id !== id));
    };

    const handleCounterpartyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newClientId = e.target.value;
        setCounterpartyId(newClientId);

        if (!newClientId || items.length === 0) return;

        const client = counterparties.find(c => c.id === newClientId);
        const pt = priceTypes.find(p => p.id === client?.priceTypeId);
        const newSlug = pt?.slug || 'standard';

        setItems(prevItems => prevItems.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return item;

            let newPrice = 0;
            if (product.prices && product.prices[newSlug]) {
                newPrice = Number(product.prices[newSlug]);
            } else if (product.prices && product.prices['standard']) {
                newPrice = Number(product.prices['standard']);
            }
            
            return {
                ...item,
                price: newPrice,
                total: Number((newPrice * item.quantity).toFixed(2))
            };
        }));
    };

    const handleSave = async () => {
        if (!counterpartyId) {
            alert(t('order.selectClient', 'Please select a client'));
            return;
        }
        if (items.length === 0) {
            if (!window.confirm(t('order.saveEmpty', 'Order has no items. Save anyway?'))) {
                return;
            }
        }

        const orderData = {
            date: new Date(date).toISOString(),
            counterpartyId,
            status,
            items,
            comment,
            amount: totalAmount,
            currency
        };
        
        await onSubmit(orderData);
    };

    if (loading && !initialData && !counterparties.length) return <div className="p-8 text-center">{t('common.loading', 'Loading...')}</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
             {/* Header */}
             <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <button onClick={() => navigate('/orders')} className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {title}
                    </h1>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                    <Save className="mr-2" size={18} />
                    {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                </button>
            </div>

            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-6">
                
                {/* Top Form: Client, Date, Status */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Client */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('menu.counterparties', 'Counterparty')}
                        </label>
                        <select
                            value={counterpartyId}
                            onChange={handleCounterpartyChange}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">{t('action.selectClient', 'Select Client')}</option>
                            {counterparties.map((cp) => (
                                <option key={cp.id} value={cp.id}>
                                    {cp.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('common.date', 'Date')}
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                     {/* Status */}
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('common.status', 'Status')}
                        </label>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as OrderStatus)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {Object.values(OrderStatus).map((s) => (
                                <option key={s} value={s}>
                                    {t(`status.${s}`, s)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Items Section */}
                <div>
                   <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {t('common.items', 'Items')}
                        </h3>
                        <button
                            onClick={() => setIsProductSelectorOpen(true)}
                            className="flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                        >
                            <Plus size={16} className="mr-1" />
                            {t('action.addProduct', 'Add Product')}
                        </button>
                   </div>
                   
                   <OrderItemsTable 
                        items={items}
                        currency={currency}
                        onUpdateItem={handleUpdateItem}
                        onRemoveItem={handleRemoveItem}
                   />
                </div>

                {/* Comment & Total */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('common.comment', 'Comment')}
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>
                    <div className="flex flex-col justify-end items-end">
                         <span className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.total', 'Total Amount')}</span>
                         <span className="text-3xl font-bold text-gray-900 dark:text-white">
                             {totalAmount.toFixed(2)} <span className="text-xl font-normal text-gray-500">{currency}</span>
                         </span>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ProductSelector 
                isOpen={isProductSelectorOpen}
                onClose={() => setIsProductSelectorOpen(false)}
                products={products}
                onSelect={handleAddProduct}
                priceSlug={priceSlug}
            />
        </div>
    );
}
