import { useEffect } from 'react';
import { useProductsStore } from '../store/products.store';
import Layout from '../components/Layout';
import { Plus } from 'lucide-react';

export default function Products() {
  const { products, loading, error, loadProducts } = useProductsStore();

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return (
    <Layout title="Products">
      <div className="mb-6 flex justify-between items-center">
        <div className="relative">
             <input 
                type="text" 
                placeholder="Search products..." 
                className="pl-4 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
             />
        </div>
        <button className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <Plus className="mr-2 h-5 w-5" />
          Add Product
        </button>
      </div>

      {loading && <div className="text-center py-10">Loading products...</div>}
      {error && <div className="text-center py-10 text-red-500">Error: {error}</div>}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Price (Standard)
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
               <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Edit</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      {product.photos && product.photos.length > 0 ? (
                        <img className="h-10 w-10 rounded-full object-cover" src={product.photos[0]} alt="" />
                      ) : (
                         <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                             N/A
                         </div>
                      )}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{product.prices?.standard?.toFixed(2)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {product.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button className="text-indigo-600 hover:text-indigo-900">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
