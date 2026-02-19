import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Plus, Trash, Check, Save } from 'lucide-react';
import { PriceDocumentsService } from '../../services/priceDocuments.service';
import { PriceTypesService } from '../../services/priceTypes.service';
import { ProductsService } from '../../services/products.service';
import type { PriceDocument, PriceDocumentItem } from '../../types/priceDocument';
import type { PriceType } from '../../types/priceType';
import type { Product } from '../../types/product';

export default function PriceDocumentEditor() {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';
    const [isEditing, setIsEditing] = useState(isNew);

    const [document, setDocument] = useState<Partial<PriceDocument>>({
        date: Date.now(),
        status: 'DRAFT',
        inputMethod: 'MANUAL',
        items: []
    });

    useEffect(() => {
        setIsEditing(isNew);
    }, [isNew]);

    
    // Data Loading
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<string>('');
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    // ... loadData ...

    const loadData = async () => {
        setLoading(true);
        try {
            const types = await PriceTypesService.fetchPriceTypes();
            setPriceTypes(types);

            // Only fetch full products list strictly needed for selector
            // Ideally we should have search, but for now fetch all
            const prods = await ProductsService.fetchProducts();
            setProducts(prods.products);

            if (!isNew && id) {
                const doc = await PriceDocumentsService.fetchDocument(id);
                setDocument(doc);
            }
        } catch (error) {
            console.error("Error loading data", error);
            setNotification({ type: 'error', message: 'Failed to load data' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            let savedDoc;
            if (isNew) {
                savedDoc = await PriceDocumentsService.createDocument(document);
            } else if (id) {
                // If existing, we update it
                savedDoc = await PriceDocumentsService.updateDocument(id, document);
            }
            
            if (savedDoc) {
                const docId = savedDoc.id;
                
                // 1. Save items
                const itemsToSave = (document.items || []).map(item => ({
                    productId: item.productId,
                    price: Number(item.price)
                }));
                await PriceDocumentsService.updateItems(docId, itemsToSave);
                
                // 2. Apply Immediately (User Requirement: "Data of prices must be written to DB at the moment of saving")
                await PriceDocumentsService.applyDocument(docId);
                
                setNotification({ type: 'success', message: 'Document saved and prices applied successfully' });
                setIsEditing(false); 
                
                // Reload to get APPLIED status?
                if (isNew) {
                     navigate(`/price-documents/${docId}`, { replace: true });
                } else {
                     loadData();
                }
            }
        } catch (error: any) {
            console.error('Error saving document', error);
            setNotification({ type: 'error', message: error.message || 'Failed to save document' });
        }
    };

    const handleApply = async () => {
        if (!id || isNew) return alert('Save document first');
        if (!confirm('Are you sure you want to apply these prices? This will update the products directly.')) return;
        
        try {
            await PriceDocumentsService.applyDocument(id);
            alert('Prices applied successfully');
            loadData(); // reload
        } catch (error) {
            console.error('Error applying document', error);
            alert('Failed to apply document');
        }
    };

    const handleApplyFormula = () => {
        const markup = document.markupPercentage;
        if (markup === undefined || markup === null || isNaN(markup)) {
            setNotification({ type: 'error', message: 'Please enter a valid markup percentage' });
            return;
        }

        const sourceSlug = document.sourcePriceTypeId 
            ? priceTypes.find(pt => String(pt.id) === String(document.sourcePriceTypeId))?.slug 
            : 'standard'; 

        if (!sourceSlug) {
             setNotification({ type: 'error', message: 'Invalid source price type' });
             return;
        }

        const updatedItems = (document.items || []).map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return item;

            const basePrice = (product.prices as any)[sourceSlug] || 0;
            // 1. Calculate with markup
            let newPrice = basePrice * (1 + markup / 100);
            
            // 2. Apply rounding if set
            const rounding = document.roundingValue;
            if (rounding && rounding > 0) {
                 newPrice = Math.round(newPrice / rounding) * rounding;
            }

            return {
                ...item,
                price: parseFloat(newPrice.toFixed(2))
            };
        });

        setDocument(prev => ({ ...prev, items: updatedItems }));
        setNotification({ type: 'success', message: 'Prices recalculated successfully' });
    };

    const handleAddItem = () => {
        if (!selectedProduct) return;
        const prod = products.find(p => p.id === selectedProduct);
        if (!prod) return;

        const currentPriceObj = prod.prices as any;
        const targetSlug = priceTypes.find(pt => String(pt.id) === String(document.targetPriceTypeId))?.slug || 'standard';
        
        // Use existing price if available, or just keeping manual entry
        // If we are in 'MANUAL' mode, user inputs price.
        // We initialize with current price if exists.
        
        const newItem: PriceDocumentItem = {
            id: Math.random().toString(), // temp id
            documentId: id || '',
            productId: prod.id,
            productName: prod.name,
            unit: prod.unit,
            price: currentPriceObj?.[targetSlug] || 0,
            createdAt: Date.now()
        };

        setDocument(prev => ({
            ...prev,
            items: [...(prev.items || []), newItem]
        }));
        setSelectedProduct('');
    };

    const handleUpdateItemPrice = (index: number, price: number) => {
        setDocument(prev => {
            const newItems = [...(prev.items || [])];
            newItems[index] = { ...newItems[index], price };
            return { ...prev, items: newItems };
        });
    };

    const handleRemoveItem = (index: number) => {
        setDocument(prev => {
            const newItems = [...(prev.items || [])];
            newItems.splice(index, 1);
            return { ...prev, items: newItems };
        });
    };

    if (loading) return <div>{t('common.loading', 'Loading...')}</div>;

    return (
        <div className="space-y-6 relative">
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg text-white ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    {notification.message}
                </div>
            )}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    <button onClick={() => navigate('/price-documents')} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {isNew ? t('priceDocument.titleNew', 'New Price Document') : t('priceDocument.titleEdit', 'Edit Price Document')}
                    </h1>
                     {document.status === 'APPLIED' && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">
                            {t('priceDocument.applied', 'APPLIED')}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap space-x-0 gap-2 w-full md:w-auto">
                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="flex-1 md:flex-none justify-center inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                        >
                            {t('common.edit', 'Edit')}
                        </button>
                    )}
                    {isEditing && (
                        <>
                            <button
                                onClick={handleSave}
                                className="flex-1 md:flex-none justify-center inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                {t('common.save', 'Save')}
                            </button>
                            {document.status !== 'APPLIED' && !isNew && (
                                <button
                                    onClick={handleApply}
                                    className="flex-1 md:flex-none justify-center inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    {t('priceDocument.applyPrices', 'Apply Prices')}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="space-y-4 sm:space-y-6">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-6 space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('priceDocument.details', 'Document Details')}</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('priceDocument.date', 'Date')}</label>
                        <input
                            type="date"
                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={new Date(document.date || Date.now()).toISOString().split('T')[0]}
                            onChange={e => setDocument({...document, date: new Date(e.target.value).getTime()})}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('priceDocument.inputMethod', 'Input Method')}</label>
                            <select
                                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={document.inputMethod || 'MANUAL'}
                                onChange={e => setDocument({...document, inputMethod: e.target.value as any})}
                                disabled={!isEditing}
                            >
                                <option value="MANUAL">{t('priceDocument.manual', 'Manual Entry')}</option>
                                <option value="FORMULA">{t('priceDocument.formula', 'Formula (Markup)')}</option>
                            </select>
                        </div>

                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('priceDocument.targetPriceType', 'Target Price Type (To set)')}</label>
                            <select
                                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={document.targetPriceTypeId || ''}
                                onChange={e => setDocument({...document, targetPriceTypeId: e.target.value})}
                                disabled={!isEditing}
                            >
                                <option value="">{t('priceDocument.targetPriceType', 'Select Target Price Type')}</option>
                                {priceTypes.map(pt => (
                                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('priceDocument.sourcePriceType', 'Source Price Type (Base for calc)')}</label>
                            <select
                                className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={document.sourcePriceTypeId || ''}
                                onChange={e => setDocument({...document, sourcePriceTypeId: e.target.value})}
                                disabled={!isEditing}
                            >
                                <option value="">{t('priceDocument.sourcePriceType', 'Select Source Price Type (Optional)')}</option>
                                {priceTypes.map(pt => (
                                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                                ))}
                            </select>
                        </div>

                        {document.inputMethod === 'FORMULA' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('priceDocument.markup', 'Markup Percentage (%)')}</label>
                                    <div className="mt-1">
                                        <input
                                            type="number"
                                            className="block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={document.markupPercentage || ''}
                                            onChange={e => setDocument({...document, markupPercentage: parseFloat(e.target.value)})}
                                            disabled={!isEditing}
                                            placeholder="e.g. 10"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('priceDocument.rounding', 'Rounding (0.01 - 10)')}</label>
                                    <div className="mt-1 flex rounded-md shadow-sm">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max="10"
                                            className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md border border-gray-300 dark:border-gray-600 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            value={document.roundingValue || ''}
                                            onChange={e => setDocument({...document, roundingValue: parseFloat(e.target.value)})}
                                            disabled={!isEditing}
                                            placeholder="e.g. 0.5"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleApplyFormula}
                                            disabled={!isEditing}
                                            className="inline-flex items-center px-4 py-2 border border-l-0 border-gray-300 rounded-r-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium"
                                        >
                                            {t('common.apply', 'Apply')}
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('priceDocument.comment', 'Comment')}</label>
                        <textarea
                            className="mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            rows={3}
                            value={document.comment || ''}
                            onChange={e => setDocument({...document, comment: e.target.value})}
                            disabled={!isEditing}
                        />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-3 sm:p-6 space-y-4 overflow-hidden">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('priceDocument.productsPrices', 'Products & Prices')}</h3>
                    
                    {isEditing && (
                        <div className="flex space-x-2">
                            <select
                                className="block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                value={selectedProduct}
                                onChange={e => setSelectedProduct(e.target.value)}
                            >
                                <option value="">{t('action.addProduct', 'Select Product to Add...')}</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleAddItem}
                                disabled={!selectedProduct || !document.targetPriceTypeId}
                                className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 disabled:opacity-50"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                    {!document.targetPriceTypeId && <p className="text-sm text-red-500">Please select Target Price Type first.</p>}

                    <div className="-mx-3 sm:mx-0 overflow-x-auto overflow-y-auto max-h-[60vh] sm:border sm:rounded-md border-y dark:border-gray-700">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    <th className="px-2 sm:px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase w-1/3">{t('common.product', 'Product')}</th>
                                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        {t('priceDocument.sourcePrice', 'Source Price')} <br/>
                                        <span className="text-[10px] normal-case">
                                            ({document.sourcePriceTypeId ? priceTypes.find(pt => pt.id === document.sourcePriceTypeId)?.name : 'Standard'})
                                        </span>
                                    </th>
                                    <th className="px-2 sm:px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                                        {t('priceDocument.targetPrice', 'Target Price')} <br/>
                                        <span className="text-[10px] normal-case">
                                            ({document.targetPriceTypeId ? priceTypes.find(pt => pt.id === document.targetPriceTypeId)?.name : 'Target'})
                                        </span>
                                    </th>
                                    <th className="px-2 sm:px-4 py-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {(() => {
                                    const groupedItems = (document.items || []).reduce((acc, item, originalIndex) => {
                                        const product = products.find(p => p.id === item.productId);
                                        const category = product?.category || 'Uncategorized';
                                        if (!acc[category]) acc[category] = [];
                                        acc[category].push({ item, originalIndex, product });
                                        return acc;
                                    }, {} as Record<string, any[]>);

                                    return Object.keys(groupedItems).sort().map(category => (
                                        <React.Fragment key={category}>
                                            <tr className="bg-gray-100 dark:bg-gray-700">
                                                <td colSpan={4} className="px-3 sm:px-4 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">
                                                    {category}
                                                </td>
                                            </tr>
                                            {groupedItems[category].sort((a,b) => (a.product?.name || '').localeCompare(b.product?.name || '')).map(({ item, originalIndex, product }) => {
                                                const sourceSlug = document.sourcePriceTypeId 
                                                    ? priceTypes.find(pt => String(pt.id) === String(document.sourcePriceTypeId))?.slug 
                                                    : 'standard';
                                                const basePrice = product ? (product.prices as any)[sourceSlug || 'standard'] : 0;

                                                return (
                                                    <tr key={originalIndex}>
                                                        <td className="px-2 sm:px-4 py-2 text-sm text-gray-900 dark:text-white break-words">
                                                            {item.productName || product?.name || 'Unknown'}
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs ml-1 whitespace-nowrap">({item.unit})</span>
                                                        </td>
                                                        <td className="px-2 sm:px-4 py-2 text-sm text-right text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                            {basePrice ? Number(basePrice).toFixed(2) : '-'}
                                                        </td>
                                                        <td className="px-2 sm:px-4 py-2 text-sm text-right">
                                                            <input
                                                                type="number"
                                                                className="w-16 sm:w-24 text-right border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                                                value={item.price}
                                                                onChange={e => handleUpdateItemPrice(originalIndex, parseFloat(e.target.value))}
                                                                disabled={!isEditing}
                                                            />
                                                        </td>
                                                        <td className="px-2 sm:px-4 py-2 text-center">
                                                            {isEditing && (
                                                                <button onClick={() => handleRemoveItem(originalIndex)} className="text-red-600 hover:text-red-900 p-1">
                                                                    <Trash className="h-4 w-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ));
                                })()}
                                {(document.items || []).length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-gray-500 text-sm">
                                            {t('common.noData', 'No data found')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
