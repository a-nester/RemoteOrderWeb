import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductsStore } from '../store/products.store';
import Layout from '../components/Layout';
import { Save, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { BASE_URL } from '../constants/api';

export default function ProductForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, loadProducts, addProduct, updateProduct, loading, error } = useProductsStore();

  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    unit: 'шт', // default unit
  });

  useEffect(() => {
    if (products.length === 0) {
      loadProducts();
    }
  }, [loadProducts, products.length]);

  useEffect(() => {
    if (isEditMode && products.length > 0) {
      const product = products.find((p) => p.id === id);
      if (product) {
        setFormData({
          name: product.name,
          category: product.category,
          price: product.prices?.standard?.toString() || '0',
          unit: product.unit,
        });
      }
    }
  }, [isEditMode, id, products]);

  // Image Upload Logic
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
     if (isEditMode && products.length > 0) {
        const product = products.find((p) => p.id === id);
        if (product && product.photos && product.photos.length > 0) {
             const photoUrl = product.photos[0];
             // If absolute URL, use as is. If relative, prepend BASE_URL (imported from api.ts)
             if (photoUrl.startsWith('http')) {
                 setImagePreview(photoUrl);
             } else {
                 setImagePreview(`${BASE_URL}${photoUrl}`);
             }
        }
     }
  }, [isEditMode, id, products]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const objectUrl = URL.createObjectURL(file);
      setImagePreview(objectUrl);
    }
  };

  // Cleanup object URL
  useEffect(() => {
    return () => {
      if (imagePreview && imagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreview);
      }
    }
  }, [imagePreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construct prices object using standard price
    const prices = { standard: parseFloat(formData.price) || 0 };

    try {
      if (isEditMode && id) {
        const productToUpdate = products.find((p) => p.id === id);
        if (!productToUpdate) return;

        await updateProduct({
          ...productToUpdate,
          name: formData.name,
          category: formData.category,
          prices,
          unit: formData.unit,
        }, imageFile || undefined); // Pass imageFile
      } else {
        await addProduct({
          name: formData.name,
          category: formData.category,
          prices,
          unit: formData.unit,
          photos: [], // Default empty
          isDeleted: false
        }, imageFile || undefined); // Pass imageFile
      }
      navigate('/products');
    } catch (err) {
      console.error("Failed to save product:", err);
    }
  };

  return (
    <Layout title={isEditMode ? 'Edit Product' : 'Add Product'}>
      <div className="max-w-2xl mx-auto">
        <button 
            onClick={() => navigate('/products')}
            className="mb-6 flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
        </button>

        <div className="bg-white shadow-md rounded-lg p-6">
          {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Product Name
              </label>
              <input
                type="text"
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <input
                type="text"
                id="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                    Price (Standard)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    id="price"
                    required
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                    Unit
                  </label>
                  <select
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="шт">шт</option>
                    <option value="кг">кг</option>
                    <option value="л">л</option>
                    <option value="пач">пач</option>
                  </select>
                </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Image
              </label>
              <div className="flex items-center space-x-6">
                <div className="shrink-0">
                  {imagePreview ? (
                    <img
                      className="h-32 w-32 object-cover rounded-lg border border-gray-300"
                      src={imagePreview}
                      alt="Current product"
                    />
                  ) : (
                    <div className="h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 bg-gray-50">
                      <ImageIcon className="h-10 w-10 opacity-50" />
                    </div>
                  )}
                </div>
                <label className="block">
                  <span className="sr-only">Choose profile photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-indigo-50 file:text-indigo-700
                      hover:file:bg-indigo-100
                      cursor-pointer
                    "
                  />
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
