import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductsStore } from '../store/products.store';
import Layout from '../components/Layout';
import { Plus, FileText, Search, Filter, Check, ChevronDown } from 'lucide-react';
import { ErrorBoundary } from "../components/ErrorBoundary";
import { PriceTypesService } from '../services/priceTypes.service';
import type { PriceType } from '../types/priceType';
import PriceListModal from '../components/PriceListModal';
import { generateExcelPriceList, generatePdfPriceList } from '../utils/priceList.utils';
import { BASE_URL } from '../constants/api';

export default function Products() {
  return (
    <ErrorBoundary>
      <ProductsContent />
    </ErrorBoundary>
  );
}

function ProductsContent() {
  const { products, loading, error, loadProducts } = useProductsStore();
  const navigate = useNavigate();
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [selectedPriceType, setSelectedPriceType] = useState<string>('standard');
  const [isPriceListModalOpen, setIsPriceListModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProducts();
    PriceTypesService.fetchPriceTypes().then(setPriceTypes).catch(console.error);
  }, [loadProducts]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.category || '');
    return matchesSearch && matchesCategory;
  });

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const handleDownloadPriceList = (priceTypeId: string, format: 'excel' | 'pdf') => {
        const priceTypeName = priceTypeId === 'standard' 
            ? 'Standard' 
            : priceTypes.find(pt => pt.slug === priceTypeId)?.name || priceTypeId;
            
        const currency = priceTypeId === 'standard' 
            ? 'UAH' 
            : priceTypes.find(pt => pt.slug === priceTypeId)?.currency || 'UAH';

        if (format === 'excel') {
            generateExcelPriceList(filteredProducts, priceTypeId, priceTypeName, currency);
        } else {
            generatePdfPriceList(filteredProducts, priceTypeId, priceTypeName, currency);
        }
  };

  return (
    <Layout title="Products">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="flex flex-1 gap-4 items-center">
            <div className="relative flex-1 max-w-md">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                     <Search className="h-4 w-4 text-gray-400" />
                 </div>
                 <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Пошук товарів..." 
                    className="pl-9 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                 />
            </div>
            
            <div className="relative" ref={categoryRef}>
                <button
                    onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:hover:bg-gray-700"
                >
                    <Filter className="h-4 w-4" />
                    <span>{selectedCategories.length > 0 ? `Категорії (${selectedCategories.length})` : 'Всі категорії'}</span>
                    <ChevronDown className="h-4 w-4" />
                </button>
                
                {isCategoryOpen && (
                    <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg z-50 max-h-96 overflow-y-auto">
                        <div className="p-2 border-b dark:border-gray-700 flex justify-between items-center">
                            <span className="text-sm font-medium dark:text-white">Фільтр категорій</span>
                            {selectedCategories.length > 0 && (
                                <button 
                                    onClick={() => setSelectedCategories([])}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                                >
                                    Скинути
                                </button>
                            )}
                        </div>
                        <div className="p-2">
                            {allCategories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => toggleCategory(cat)}
                                    className="flex items-center w-full px-2 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md dark:text-gray-200"
                                >
                                    <div className={`w-4 h-4 mr-3 rounded border flex items-center justify-center ${selectedCategories.includes(cat) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}`}>
                                        {selectedCategories.includes(cat) && <Check className="w-3 h-3" />}
                                    </div>
                                    <span className="truncate">{cat}</span>
                                </button>
                            ))}
                            {allCategories.length === 0 && (
                                <div className="p-2 text-sm text-gray-500 text-center">Немає категорій</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
        
        <div className="flex gap-2">
            <select
                value={selectedPriceType}
                onChange={(e) => setSelectedPriceType(e.target.value)}
                className="border rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-white dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
                <option value="standard">Standard Price</option>
                {priceTypes.map(pt => (
                    <option key={pt.id} value={pt.slug}>{pt.name}</option>
                ))}
            </select>
            
            <button
                onClick={() => setIsPriceListModalOpen(true)}
                className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
            >
                <FileText className="mr-2 h-5 w-5" />
                Price List
            </button>

            <button 
                onClick={() => navigate('/products/new')}
                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
            <Plus className="mr-2 h-5 w-5" />
            Add Product
            </button>
        </div>
      </div>

      {loading && <div className="text-center py-10 dark:text-white">Loading products...</div>}
      {error && <div className="text-center py-10 text-red-500">Error: {error}</div>}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider w-[40%]">
                Product
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Price ({selectedPriceType === 'standard' ? 'Standard' : priceTypes.find(pt => pt.slug === selectedPriceType)?.name})
              </th>
              <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Unit
              </th>
               <th scope="col" className="relative px-3 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredProducts.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-3 py-4 max-w-[200px]">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {product.photos && product.photos.length > 0 ? (
                        <img className="h-10 w-10 rounded-full object-cover" 
                             src={product.photos[0].startsWith('http') ? product.photos[0] : `${BASE_URL}${product.photos[0]}`} 
                             alt="" />
                      ) : (
                         <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-300">
                             N/A
                         </div>
                      )}
                    </div>
                    <div className="ml-4 dropdown">
                      <div className="text-sm font-medium text-gray-900 dark:text-white break-words">{product.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-300">{product.category}</div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-gray-300">
                    {product.prices?.[selectedPriceType] != null 
                        ? Number(product.prices[selectedPriceType]).toFixed(2) 
                        : '0.00'}
                  </div>
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {product.unit}
                </td>
                <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                  >
                      Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PriceListModal 
        isOpen={isPriceListModalOpen}
        onClose={() => setIsPriceListModalOpen(false)}
        priceTypes={priceTypes}
        onDownload={handleDownloadPriceList}
      />
    </Layout>
  );
}
