import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProductsStore } from '../store/products.store';
import Layout from '../components/Layout';
import { Plus, FileText } from 'lucide-react';
import { ErrorBoundary } from "../components/ErrorBoundary";
import { PriceTypesService } from '../services/priceTypes.service';
import type { PriceType } from '../types/priceType';
import PriceListModal from '../components/PriceListModal';
import { generateExcelPriceList, generatePdfPriceList } from '../utils/priceList.utils';

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

  useEffect(() => {
    loadProducts();
    PriceTypesService.fetchPriceTypes().then(setPriceTypes).catch(console.error);
  }, [loadProducts]);

  const handleDownloadPriceList = (priceTypeId: string, format: 'excel' | 'pdf') => {
        const priceTypeName = priceTypeId === 'standard' 
            ? 'Standard' 
            : priceTypes.find(pt => pt.slug === priceTypeId)?.name || priceTypeId;
            
        const currency = priceTypeId === 'standard' 
            ? 'UAH' 
            : priceTypes.find(pt => pt.slug === priceTypeId)?.currency || 'UAH';

        if (format === 'excel') {
            generateExcelPriceList(products, priceTypeId, priceTypeName, currency);
        } else {
            generatePdfPriceList(products, priceTypeId, priceTypeName, currency);
        }
  };

  return (
    <Layout title="Products">
      <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
        <div className="relative">
             <input 
                type="text" 
                placeholder="Search products..." 
                className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
             />
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
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-3 py-4 max-w-[200px]">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {product.photos && product.photos.length > 0 ? (
                        <img className="h-10 w-10 rounded-full object-cover" src={product.photos[0]} alt="" />
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
