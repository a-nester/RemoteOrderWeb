import { useState, useEffect, useMemo } from 'react';
import { X, CheckCircle, Save, Search, Printer, Plus } from 'lucide-react';
import { StockTransferService } from '../../services/stockTransfer.service';
import type { StockTransferItem } from '../../services/stockTransfer.service';
import { OrganizationService } from '../../services/organization.service';
import { ProductsService } from '../../services/products.service';
import ProductSelector from '../../components/ProductSelector';
import type { Product } from '../../types/product';
import type { Warehouse } from '../../types/organization';
import { numberToWordsUk } from '../../utils/numberToWords';

interface StockTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId?: string | null;
  onSuccess: () => void;
}

export default function StockTransferModal({ isOpen, onClose, documentId, onSuccess }: StockTransferModalProps) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [fromWarehouseId, setFromWarehouseId] = useState<string>('');
  const [toWarehouseId, setToWarehouseId] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [items, setItems] = useState<StockTransferItem[]>([]);
  const [status, setStatus] = useState<'DRAFT' | 'POSTED' | 'CANCELLED'>('DRAFT');
  const [docNumber, setDocNumber] = useState<string>('');
  const [docDate, setDocDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingStock, setFetchingStock] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPrintMode, setIsPrintMode] = useState(false);
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
      alert(`Товар "${product.name}" вже є в списку переміщення`);
      return;
    }

    const price = Number(product.prices?.['enterPrice'] || product.prices?.['base'] || Object.values(product.prices || {})[0] || 0);

    const newItem: StockTransferItem = {
      productId: product.id,
      productName: product.name,
      productCode: product.barcode || product.id.slice(0, 8),
      unit: product.unit,
      availableQty: 0,
      quantity: 1,
      price,
    };

    setItems((prev) => [...prev, newItem]);
    setIsProductSelectorOpen(false);
  };

  const loadWarehouses = async () => {
    try {
      const data = await OrganizationService.getWarehouses();
      setWarehouses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setFromWarehouseId('');
    setToWarehouseId('');
    setComment('');
    setItems([]);
    setStatus('DRAFT');
    setDocNumber('');
    setDocDate(new Date().toISOString());
    setIsPrintMode(false);
  };

  const loadDocument = async (id: string) => {
    setLoading(true);
    try {
      const doc = await StockTransferService.getById(id);
      setFromWarehouseId(doc.fromWarehouseId);
      setToWarehouseId(doc.toWarehouseId);
      setComment(doc.comment || '');
      setStatus(doc.status);
      setDocNumber(doc.number || '');
      setDocDate(doc.date || new Date().toISOString());
      setItems(doc.items || []);
    } catch (err) {
      console.error(err);
      alert('Помилка завантаження документу переміщення');
    } finally {
      setLoading(false);
    }
  };

  const handleFromWarehouseChange = async (whId: string) => {
    setFromWarehouseId(whId);
    if (!documentId && status === 'DRAFT') {
      setFetchingStock(true);
      try {
        const stockItems = await StockTransferService.getStockFill(whId);
        setItems(stockItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productCode: item.productCode,
          unit: item.unit,
          availableQty: item.availableQty,
          quantity: 0, // Default 0 to let user enter transferred amount
          price: item.price,
        })));
      } catch (err) {
        console.error(err);
      } finally {
        setFetchingStock(false);
      }
    }
  };

  const handleQtyChange = (productId: string, val: string) => {
    const num = Math.max(0, Number(val) || 0);
    setItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: num } : item
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

  const activeTransferredItems = useMemo(() => {
    return items.filter(item => item.quantity > 0);
  }, [items]);

  const totals = useMemo(() => {
    let totalQty = 0;
    let totalSum = 0;

    items.forEach((item) => {
      totalQty += item.quantity;
      totalSum += item.quantity * item.price;
    });

    return { totalQty, totalSum };
  }, [items]);

  const fromWhName = useMemo(() => {
    return warehouses.find(w => w.id === fromWarehouseId)?.name || 'Склад-відправник';
  }, [warehouses, fromWarehouseId]);

  const toWhName = useMemo(() => {
    return warehouses.find(w => w.id === toWarehouseId)?.name || 'Склад-отримувач';
  }, [warehouses, toWarehouseId]);

  const handleSave = async (shouldPost = false) => {
    if (!fromWarehouseId || !toWarehouseId) {
      alert('Будь ласка, виберіть Склад-відправник та Склад-отримувач');
      return;
    }
    if (fromWarehouseId === toWarehouseId) {
      alert('Склад-відправник та Склад-отримувач мають бути різними');
      return;
    }

    const transferItems = items.filter(i => i.quantity > 0);
    if (transferItems.length === 0) {
      alert('Вкажіть кількість принаймні для одного товару для переміщення');
      return;
    }

    setLoading(true);
    try {
      let savedDocId = documentId;

      if (documentId) {
        await StockTransferService.update(documentId, {
          fromWarehouseId,
          toWarehouseId,
          comment,
          items: transferItems,
        });
      } else {
        const created = await StockTransferService.create({
          fromWarehouseId,
          toWarehouseId,
          comment,
          items: transferItems,
        });
        savedDocId = created.id;
      }

      if (shouldPost && savedDocId) {
        await StockTransferService.postDocument(savedDocId);
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

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const isReadOnly = status === 'POSTED';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden print:max-w-none print:max-h-none print:shadow-none print:rounded-none">
        
        {/* Header - Screen only */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 print:hidden">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {documentId ? `Накладна переміщення #${docNumber}` : 'Нове переміщення товарів'}
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPrintMode(!isPrintMode)}
              className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 transition-colors"
            >
              <Printer size={18} className="mr-1.5" />
              {isPrintMode ? 'Редагувати' : 'Друкована форма'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Printable View */}
        {isPrintMode ? (
          <div className="p-8 overflow-y-auto flex-1 space-y-6 text-black bg-white print:p-0">
            <div className="border-b-2 border-gray-800 pb-4 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wide">Видаткова Накладна (Переміщення)</h1>
                <p className="text-sm font-semibold">№ {docNumber || 'Чернетка'} від {new Date(docDate || Date.now()).toLocaleDateString('uk-UA')}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold">RemoteOrder Inc.</p>
                <p className="text-gray-600">Внутрішнє переміщення товарно-матеріальних цінностей</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 bg-gray-50 p-4 rounded-lg border border-gray-300 text-sm">
              <div>
                <span className="font-bold text-gray-700 block mb-1">Склад-відправник (Звідки):</span>
                <p className="text-base font-bold text-gray-900">{fromWhName}</p>
              </div>
              <div>
                <span className="font-bold text-gray-700 block mb-1">Склад-отримувач (Куди):</span>
                <p className="text-base font-bold text-gray-900">{toWhName}</p>
              </div>
            </div>

            <table className="min-w-full divide-y divide-gray-300 border border-gray-300 text-xs">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left font-bold border-r">№</th>
                  <th className="px-3 py-2 text-left font-bold border-r">Код</th>
                  <th className="px-3 py-2 text-left font-bold border-r">Товар</th>
                  <th className="px-3 py-2 text-center font-bold border-r">Од.</th>
                  <th className="px-3 py-2 text-right font-bold border-r">Кількість</th>
                  <th className="px-3 py-2 text-right font-bold border-r">Ціна (собівартість)</th>
                  <th className="px-3 py-2 text-right font-bold">Сума</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activeTransferredItems.map((item, idx) => (
                  <tr key={item.productId}>
                    <td className="px-3 py-1.5 border-r text-center">{idx + 1}</td>
                    <td className="px-3 py-1.5 border-r font-mono">{item.productCode || '-'}</td>
                    <td className="px-3 py-1.5 border-r font-medium">{item.productName}</td>
                    <td className="px-3 py-1.5 border-r text-center">{item.unit || 'шт'}</td>
                    <td className="px-3 py-1.5 border-r text-right font-bold">{item.quantity}</td>
                    <td className="px-3 py-1.5 border-r text-right">{item.price.toFixed(2)} ₴</td>
                    <td className="px-3 py-1.5 text-right font-bold">{(item.quantity * item.price).toFixed(2)} ₴</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pt-2 border-t border-gray-400 space-y-2">
              <div className="flex justify-between items-center font-bold text-sm">
                <span>Всього найменувань: {activeTransferredItems.length}, на суму:</span>
                <span className="text-base">{totals.totalSum.toFixed(2)} ₴</span>
              </div>
              <p className="text-xs text-gray-700 italic">
                Сума словами: {numberToWordsUk(totals.totalSum)}
              </p>
            </div>

            <div className="pt-12 grid grid-cols-2 gap-16 text-sm">
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold">Сдав (комірник відправника):</p>
                <div className="mt-8 border-b border-gray-400 w-3/4"></div>
                <p className="text-xs text-gray-500 mt-1">(Підпис, ПІБ)</p>
              </div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold">Прийняв (комірник отримувача):</p>
                <div className="mt-8 border-b border-gray-400 w-3/4"></div>
                <p className="text-xs text-gray-500 mt-1">(Підпис, ПІБ)</p>
              </div>
            </div>

            <div className="pt-6 text-center print:hidden">
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors"
              >
                Роздрукувати накладну
              </button>
            </div>
          </div>
        ) : (
          /* Form Editor Body */
          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Склад-відправник (Звідки) <span className="text-red-500">*</span>
                </label>
                <select
                  value={fromWarehouseId}
                  onChange={(e) => handleFromWarehouseChange(e.target.value)}
                  disabled={isReadOnly || !!documentId}
                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white disabled:bg-gray-100"
                >
                  <option value="">-- Виберіть склад-відправник --</option>
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Склад-отримувач (Куди) <span className="text-red-500">*</span>
                </label>
                <select
                  value={toWarehouseId}
                  onChange={(e) => setToWarehouseId(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white disabled:bg-gray-100"
                >
                  <option value="">-- Виберіть склад-отримувач --</option>
                  {warehouses
                    .filter((wh) => wh.id !== fromWarehouseId)
                    .map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name}
                      </option>
                    ))}
                </select>
              </div>
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
                placeholder="Примітка до переміщення..."
                className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white disabled:bg-gray-100"
              />
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
                <span className="text-sm text-blue-600 animate-pulse">Завантаження залишків склада...</span>
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
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Доступно на складі</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Кількість для переміщення</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Собівартість одиниці</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Сума</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredItems.map((item, index) => {
                    const itemTotal = item.quantity * item.price;
                    const isExceeding = item.quantity > (item.availableQty || 0);

                    return (
                      <tr key={item.productId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-3 py-2 text-sm text-gray-500">{index + 1}</td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">{item.productCode || '-'}</td>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-900 dark:text-white">{item.productName}</td>
                        <td className="px-3 py-2 text-sm font-bold text-gray-700 dark:text-gray-300 text-right">
                          {item.availableQty || 0} {item.unit || ''}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            step="0.001"
                            min="0"
                            max={item.availableQty}
                            value={item.quantity}
                            disabled={isReadOnly}
                            onChange={(e) => handleQtyChange(item.productId, e.target.value)}
                            className={`w-24 text-right border rounded px-2 py-1 text-sm font-bold bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                              isExceeding ? 'border-red-500 bg-red-50 dark:bg-red-950/40 text-red-600' : 'border-gray-300 dark:border-gray-600'
                            }`}
                          />
                        </td>
                        <td className="px-3 py-2 text-sm text-gray-500 text-right">{item.price.toFixed(2)} ₴</td>
                        <td className="px-3 py-2 text-sm font-bold text-gray-900 dark:text-white text-right">
                          {itemTotal.toFixed(2)} ₴
                        </td>
                      </tr>
                    );
                  })}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-500">
                        Товари не знайдено або відсутні на складі-відправнику
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl flex justify-between items-center border border-gray-200 dark:border-gray-700">
              <div>
                <span className="text-xs text-gray-500 block">Позицій до переміщення:</span>
                <span className="text-base font-bold text-gray-900 dark:text-white">{activeTransferredItems.length}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Загальна кількість:</span>
                <span className="text-base font-bold text-blue-600">{totals.totalQty.toFixed(3)}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block">Загальна сума себевартості:</span>
                <span className="text-lg font-bold text-green-600">{totals.totalSum.toFixed(2)} ₴</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions - Screen only */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Скасувати
          </button>
          {!isReadOnly && !isPrintMode && (
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
                Провести переміщення
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
