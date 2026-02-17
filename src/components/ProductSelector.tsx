
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Plus } from 'lucide-react';
import type { Product } from '../types/product';

interface ProductSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
    onSelect: (product: Product) => void;
}

export default function ProductSelector({ isOpen, onClose, products, onSelect }: ProductSelectorProps) {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category).filter(Boolean));
        return ['All', ...Array.from(cats)].sort();
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchTerm, selectedCategory]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {t('product.select', 'Select Product')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Filters */}
                <div className="p-4 space-y-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder={t('common.search', 'Search...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500"
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                                    selectedCategory === cat
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredProducts.map(product => (
                            <div
                                key={product.id}
                                onClick={() => onSelect(product)}
                                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all bg-white dark:bg-gray-800 flex flex-col justify-between h-full"
                            >
                                <div>
                                    <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 mb-2">
                                        {product.name}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                        {Number(product.prices?.standard || 0).toFixed(2)} 
                                        <span className="text-xs ml-1">UAH</span> 
                                        <span className="mx-1">/</span> 
                                        {product.unit}
                                    </p>
                                </div>
                                <button className="mt-2 w-full py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-900/50">
                                    <Plus size={16} />
                                    {t('common.add', 'Add')}
                                </button>
                            </div>
                        ))}
                        {filteredProducts.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                {t('common.noResults', 'No products found')}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
