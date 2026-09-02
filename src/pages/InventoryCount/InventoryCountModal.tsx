import { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, Save, Search, Plus } from 'lucide-react';
import { InventoryCountService } from '../../services/inventoryCount.service';
import type { InventoryCountItem } from '../../services/inventoryCount.service';
import { OrganizationService } from '../../services/organization.service';
import { ProductsService } from '../../services/products.service';
import ProductSelector from '../../components/ProductSelector';
import type { Product } from '../../types/product';
import type { Warehouse } from '../../types/organization';

interface InventoryCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string | null;
  onSuccess: () => void;
}

export default function InventoryCountModal({ isOpen, onClose, documentId, onSuccess }: InventoryCountModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [items, setItems] = useState<InventoryCountItem[]>([]);
  const [status, setStatus] = useState<'DRAFT' | 'SAVED' | 'POSTED' | 'CANCELLED'>('DRAFT');
  const [docNumber, setDocNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingStock, setFetchingStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWarehouses();
      loadProducts();
      if (documentId) {
        loadDocument(documentId);
      } else {
        resetForm();
      }
    }
  }, [isOpen, documentId]);

  const loadProducts = async () => {
    try {
      const data = await ProductsService.fetchProducts();
      setAllProducts(data.products || []);
    } catch (err) {
      console.error('Failed to load products for selector:', err);
    }
  };

  const handleProductSelect = (product: Product) => {
    const exists = items.some((i) => i.productId === product.id);
    if (exists) {
      alert(`Товар "${product.name}" вже є в списку інвентаризації`);
      return;
    }

    const price = Number(product.prices?.['enterPrice'] || product.prices?.['base'] || Object.values(product.prices || {})[0] || 0);

    const newItem: InventoryCountItem = {
      productId: product.id,
      productName: product.name,
      productCode: product.barcode || product.id.slice(0, 8),
      unit: product.unit,
      accountingQty: 0,
      actualQty: 0,
      price,
    };

    setItems((prev) => [...prev, newItem]);
    setIsProductSelectorOpen(false);
  };

  const loadWarehouses = async () => {
    try {
      const data = await OrganizationService.getWarehouses();
      setWarehouses(data);
      if (data.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setSelectedWarehouseId('');
    setComment('');
    setItems([]);
    setStatus('DRAFT');
    setDocNumber('');
  };

  const loadDocument = async (id: string) => {
    setLoading(true);
    try {
      const doc = await InventoryCountService.getById(id);
      setSelectedWarehouseId(doc.warehouseId);
      setComment(doc.comment || '');
      setStatus(doc.status);
      setDocNumber(doc.number || '');
      setItems(doc.items || []);
    } catch (err) {
      console.error(err);
      alert('Помилка завантаження документу');
    } finally {
      setLoading(false);
    }
  };

  const handleWarehouseChange = async (whId: string) => {
    setSelectedWarehouseId(whId);
    if (!documentId && status === 'DRAFT') {
      setFetchingStock(true);
      try {
        const stockItems = await InventoryCountService.getStockFill(whId);
        setItems(stockItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          unit: item.unit,
          accountingQty: item.accountingQty,
          actualQty: item.accountingQty, // Default actual to accounting
          price: item.price,
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingStock(false);
      }
    }
  };

  const handleActualQtyChange = (productId: string, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, actualQty: num } : item
      )
    );
  };

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        (item.productName || '').toLowerCase().includes(q) ||
        (item.productCode || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const totals = useMemo(() => {
    let accounting = 0;
    let actual = 0;
    let surplus = 0;
    let shortage = 0;

    items.forEach((item) => {
      const acTotal = item.accountingQty * item.price;
      const actTotal = item.actualQty * item.price;
      const diffTotal = (item.actualQty - item.accountingQty) * item.price;

      accounting += acTotal;
      actual += actTotal;
      if (diffTotal > 0) surplus += diffTotal;
      if (diffTotal < 0) shortage += Math.abs(diffTotal);
    });

    return { accounting, actual, surplus, shortage };
  }, [items]);

  const handleSave = async (shouldPost = false) => {
    if (!selectedWarehouseId) {
      alert('Будь ласка, виберіть склад');
      return;
    }

    setLoading(true);
    try {
      let savedDocId = documentId;

      if (documentId) {
        await InventoryCountService.update(documentId, {
          warehouseId: selectedWarehouseId,
          comment,
          items,
        });
      } else {
        const created = await InventoryCountService.create({
          warehouseId: selectedWarehouseId,
          comment,
          items,
        });
        savedDocId = created.id;
      }

      if (shouldPost && savedDocId) {
        await InventoryCountService.postDocument(savedDocId);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Помилка збереження документу');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = status === 'POSTED';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {documentId ? `Інвентаризація ${docNumber ? '#' + docNumber : ''}` : 'Нова Інвентаризація'}
            </h2>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                status === 'POSTED'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
              }`}
            >
              {status === 'POSTED' ? 'Проведено' : 'Чернетка'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Склад <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => handleWarehouseChange(e.target.value)}
                disabled={isReadOnly || !!documentId}
                className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white disabled:bg-gray-100"
              >
                <option value="">-- Виберіть склад --</option>
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id}>
                    {wh.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Примітка
              </label>
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={isReadOnly}
                placeholder="Коментар комірника/менеджера..."
                className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Search Items & Product Picker */}
          <div className="flex justify-between items-center gap-4 pt-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Пошук товару за кодом або назвою..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 dark:text-white"
              />
            </div>

            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setIsProductSelectorOpen(true)}
                className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors whitespace-nowrap shadow-sm"
              >
                <Plus size={18} className="mr-1.5" />
                Підбір товару
              </button>
            )}

            {fetchingStock && (
              <span className="text-sm text-blue-600 animate-pulse">Завантаження товарів складу...</span>
            )}
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Код</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Товар</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Обліковий залишок</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Фактичний залишок</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Відхилення</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Ціна одиниці</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Сума відхилення</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                {filteredItems.map((item, index) => {
                  const diff = item.actualQty - item.accountingQty;
                  const diffTotal = diff * item.price;

                  return (
                    <tr key={item.productId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">{item.productCode || '-'}</td>
                      <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">{item.productName}</td>
                      <td className="px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 text-right">
                        {item.accountingQty} {item.unit || ''}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          step="0.001"
                          min="0"
                          value={item.actualQty}
                          disabled={isReadOnly}
                          onChange={(e) => handleActualQtyChange(item.productId, e.target.value)}
                          className="w-24 text-right border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-bold bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className={`px-3 py-2 text-sm font-bold text-right ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {diff > 0 ? `+${diff.toFixed(3)}` : diff.toFixed(3)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500 text-right">{item.price.toFixed(2)} ₴</td>
                      <td className={`px-3 py-2 text-sm font-bold text-right ${diffTotal > 0 ? 'text-green-600' : diffTotal < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                        {diffTotal > 0 ? `+${diffTotal.toFixed(2)}` : diffTotal.toFixed(2)} ₴
                      </td>
                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-500">
                      Товари не знайдено
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4 border border-gray-200 dark:border-gray-700">
            <div>
              <span className="text-xs text-gray-500 block">Облікова сума:</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">{totals.accounting.toFixed(2)} ₴</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Фактична сума:</span>
              <span className="text-base font-bold text-blue-600">{totals.actual.toFixed(2)} ₴</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Лишки (Оприбуткування):</span>
              <span className="text-base font-bold text-green-600">+{totals.surplus.toFixed(2)} ₴</span>
            </div>
            <div>
              <span className="text-xs text-gray-500 block">Нестачі (Списання):</span>
              <span className="text-base font-bold text-red-600">-{totals.shortage.toFixed(2)} ₴</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Скасувати
          </button>
          {!isReadOnly && (
            <div className="flex gap-3">
              <button
                onClick={() => handleSave(false)}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors"
              >
                <Save size={18} className="mr-2" />
                Зберегти чернетку
              </button>
              <button
                onClick={() => handleSave(true)}
                disabled={loading}
                className="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium shadow-sm transition-colors"
              >
                <CheckCircle size={18} className="mr-2" />
                Провести інвентаризацію
              </button>
            </div>
          )}
        </div>
      </div>

      <ProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        products={allProducts}
        onSelect={handleProductSelect}
        priceSlug="enterPrice"
      />
    </div>
  );
}
