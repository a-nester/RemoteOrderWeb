import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash, Check, Save } from 'lucide-react';
import { PriceDocumentsService } from '../../services/priceDocuments.service';
import { PriceTypesService } from '../../services/priceTypes.service';
import { ProductsService } from '../../services/products.service';
import type { PriceDocument, PriceDocumentItem } from '../../types/priceDocument';
import type { PriceType } from '../../types/priceType';
import type { Product } from '../../types/product';

export default function PriceDocumentEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isNew = id === 'new';

    const [document, setDocument] = useState<Partial<PriceDocument>>({
        date: Date.now(),
        status: 'DRAFT',
        inputMethod: 'MANUAL',
        items: []
    });

    
    // Data Loading
    const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [id]);

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
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            let savedDoc;
            if (isNew) {
                savedDoc = await PriceDocumentsService.createDocument(document);
                // navigate(`/price-documents/${savedDoc.id}`, { replace: true });
            } else if (id) {
                savedDoc = await PriceDocumentsService.updateDocument(id, document);
            }
            
            if (savedDoc) {
                // Save items
                const docId = savedDoc.id;
                const itemsToSave = (document.items || []).map(item => ({
                    productId: item.productId,
                    price: Number(item.price)
                }));
                await PriceDocumentsService.updateItems(docId, itemsToSave);
                
                alert('Document saved successfully');
                if (isNew) navigate('/price-documents');
            }
        } catch (error) {
            console.error('Error saving document', error);
            alert('Failed to save document');
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

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button onClick={() => navigate('/price-documents')} className="text-gray-500 hover:text-gray-700">
                        <ArrowLeft className="h-6 w-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isNew ? 'New Price Document' : 'Edit Price Document'}
                    </h1>
                     {document.status === 'APPLIED' && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-bold">APPLIED</span>
                    )}
                </div>
                <div className="flex space-x-3">
                    {document.status !== 'APPLIED' && (
                        <>
                            <button
                                onClick={handleSave}
                                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Save Draft
                            </button>
                            {!isNew && (
                                <button
                                    onClick={handleApply}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
                                >
                                    <Check className="h-4 w-4 mr-2" />
                                    Apply Prices
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="bg-white shadow rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Document Details</h3>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Date</label>
                        <input
                            type="date"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={new Date(document.date || Date.now()).toISOString().split('T')[0]}
                            onChange={e => setDocument({...document, date: new Date(e.target.value).getTime()})}
                            disabled={document.status === 'APPLIED'}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Target Price Type</label>
                        <select
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={document.targetPriceTypeId || ''}
                            onChange={e => setDocument({...document, targetPriceTypeId: e.target.value})}
                            disabled={document.status === 'APPLIED'}
                        >
                            <option value="">Select Price Type</option>
                            {priceTypes.map(pt => (
                                <option key={pt.id} value={pt.id}>{pt.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Comment</label>
                        <textarea
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            rows={3}
                            value={document.comment || ''}
                            onChange={e => setDocument({...document, comment: e.target.value})}
                            disabled={document.status === 'APPLIED'}
                        />
                    </div>
                </div>

                <div className="bg-white shadow rounded-lg p-6 space-y-4">
                    <h3 className="text-lg font-medium text-gray-900">Products & Prices</h3>
                    
                    {document.status !== 'APPLIED' && (
                        <div className="flex space-x-2">
                            <select
                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                value={selectedProduct}
                                onChange={e => setSelectedProduct(e.target.value)}
                            >
                                <option value="">Select Product to Add...</option>
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

                    <div className="overflow-y-auto max-h-96 border rounded-md">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                                    <th className="px-4 py-2"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {(document.items || []).map((item, index) => (
                                    <tr key={index}>
                                        <td className="px-4 py-2 text-sm text-gray-900">
                                            {item.productName || products.find(p => p.id === item.productId)?.name || 'Unknown'}
                                            <span className="text-gray-500 text-xs ml-1">({item.unit})</span>
                                        </td>
                                        <td className="px-4 py-2 text-sm text-right">
                                            <input
                                                type="number"
                                                className="w-24 text-right border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm py-1"
                                                value={item.price}
                                                onChange={e => handleUpdateItemPrice(index, parseFloat(e.target.value))}
                                                disabled={document.status === 'APPLIED'}
                                            />
                                        </td>
                                        <td className="px-4 py-2 text-center">
                                            {document.status !== 'APPLIED' && (
                                                <button onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-900">
                                                    <Trash className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {(document.items || []).length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-4 py-8 text-center text-gray-500 text-sm">
                                            No products added yet.
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
