import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GoodsReceiptService } from "../../services/goodsReceipt.service";
import { ProductsService } from "../../services/products.service";
import { OrganizationService } from "../../services/organization.service";
import { CounterpartyService } from "../../services/counterparty.service";
import { PriceTypesService } from "../../services/priceTypes.service";
import type { GoodsReceipt, GoodsReceiptItem } from "../../types/goodsReceipt";
import type { Product } from "../../types/product";
import type { Warehouse } from "../../types/organization";
import type { Counterparty } from "../../types/counterparty";
import type { PriceType } from "../../types/priceType";
import ProductSelector from "../../components/ProductSelector";
import QuantityModal from "../../components/QuantityModal";

interface SortableRowProps {
  item: GoodsReceiptItem;
  index: number;
  products: Product[];
  handleItemChange: (
    index: number,
    field: keyof GoodsReceiptItem,
    value: any,
  ) => void;
  removeItem: (index: number) => void;
}

function SortableRow({
  item,
  index,
  products,
  handleItemChange,
  removeItem,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 2 : 1,
    position: isDragging ? "relative" : ("static" as any),
  } as React.CSSProperties;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={
        isDragging ? "bg-gray-50 dark:bg-gray-700 shadow-md relative z-10" : ""
      }
    >
      <td className="px-4 py-2 text-center text-gray-500">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab hover:text-gray-700 dark:hover:text-gray-300"
        >
          <GripVertical size={18} />
        </button>
      </td>
      <td className="px-4 py-2 text-sm text-gray-900 dark:text-white font-medium">
        {products.find((p) => p.id === item.productId)?.name || "—"}
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          step="0.001"
          value={item.quantity}
          onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
          className="w-full rounded border-gray-300 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </td>
      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.price}
          onChange={(e) => handleItemChange(index, "price", e.target.value)}
          className="w-full rounded border-gray-300 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </td>
      <td className="px-4 py-2 text-right font-medium dark:text-white">
        {Number(item.total).toFixed(2)}
      </td>
      <td className="px-4 py-2 text-center">
        <button
          onClick={() => removeItem(index)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
}

export default function GoodsReceiptEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const copyFromId = new URLSearchParams(location.search).get("copyFrom");
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Data sources
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [providers, setProviders] = useState<Counterparty[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

  // Form State
  const [doc, setDoc] = useState<Partial<GoodsReceipt>>({
    date: new Date().toISOString(),
    status: "SAVED",
    items: [],
  });

  // UI State
  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [selectedProductForQty, setSelectedProductForQty] = useState<Product | null>(null);

  // Derived
  const priceSlug = useMemo(() => {
    if (!doc.priceTypeId) return "standard";
    const pt = priceTypes.find((p) => p.id === doc.priceTypeId);
    return pt ? pt.slug : "standard";
  }, [doc.priceTypeId, priceTypes]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load types
      const [prodsData, whs, cnts, pts] = await Promise.all([
        ProductsService.fetchProducts(),
        OrganizationService.getWarehouses(),
        CounterpartyService.getAll(),
        PriceTypesService.fetchPriceTypes(),
      ]);
      setProducts(prodsData.products);
      setWarehouses(whs);
      setProviders(cnts);
      setPriceTypes(pts);

      if (!isNew && id) {
        const existing = await GoodsReceiptService.getById(id);
        setDoc(existing);
      } else if (copyFromId) {
        const existing = await GoodsReceiptService.getById(copyFromId);
        setDoc({
            ...existing,
            id: undefined,
            date: new Date().toISOString(),
            status: "SAVED",
            number: `GR-${Date.now().toString().slice(-6)}`,
            items: existing.items?.map(i => ({ ...i, id: crypto.randomUUID() })) || []
        });
      } else {
        // Set default number?
        setDoc((prev) => ({
          ...prev,
          number: `GR-${Date.now().toString().slice(-6)}`,
        }));
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderChange = (field: keyof GoodsReceipt, value: any) => {
    setDoc((prev) => ({ ...prev, [field]: value }));
  };

  const recalculatePrices = (
    priceTypeId: string,
    currentItems: GoodsReceiptItem[],
  ) => {
    const type = priceTypes.find((t) => t.id === priceTypeId);
    if (!type) return currentItems;

    return currentItems.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product || !product.prices) return item;

      const newPrice = Number(product.prices[type.slug]) || 0;
      return {
        ...item,
        price: newPrice,
        total: Number(item.quantity || 0) * newPrice,
      };
    });
  };

  const handlePriceTypeChange = (newTypeId: string) => {
    setDoc((prev) => {
      const newItems = recalculatePrices(newTypeId, prev.items || []);
      return { ...prev, priceTypeId: newTypeId, items: newItems };
    });
  };

  const handleItemChange = (
    index: number,
    field: keyof GoodsReceiptItem,
    value: any,
  ) => {
    const newItems = [...(doc.items || [])];
    const item = { ...newItems[index], [field]: value };

    // Auto-set price if Product changed and PriceType selected
    if (field === "productId") {
      const product = products.find((p) => p.id === value);
      if (product && doc.priceTypeId) {
        const type = priceTypes.find((t) => t.id === doc.priceTypeId);
        if (type && product.prices) {
          item.price = Number(product.prices[type.slug]) || 0;
        }
      }
    }

    // Recalculate total always
    item.total = Number(item.quantity || 0) * Number(item.price || 0);

    newItems[index] = item;
    setDoc((prev) => ({ ...prev, items: newItems }));
  };

  const addItem = () => {
    setIsProductSelectorOpen(true);
  };

  const handleConfirmQuantity = (product: Product, quantity: number, price: number) => {
    setDoc((prev) => {
      const existingItems = prev.items || [];
      const existingItemIndex = existingItems.findIndex(i => i.productId === product.id);
      
      const newItems = [...existingItems];
      if (existingItemIndex >= 0) {
        newItems[existingItemIndex] = {
          ...newItems[existingItemIndex],
          quantity: newItems[existingItemIndex].quantity + quantity,
          price: price,
          total: Number((newItems[existingItemIndex].quantity + quantity) * price).toFixed(2) as any
        };
      } else {
        newItems.push({
          id: crypto.randomUUID(),
          goodsReceiptId: id === "new" ? undefined : id,
          productId: product.id,
          quantity,
          price,
          total: Number(quantity * price).toFixed(2) as any
        } as GoodsReceiptItem);
      }
      return { ...prev, items: newItems };
    });
    setSelectedProductForQty(null);
  };

  const removeItem = (index: number) => {
    const newItems = [...(doc.items || [])];
    newItems.splice(index, 1);
    setDoc((prev) => ({ ...prev, items: newItems }));
  };

  const save = async (post: boolean = false) => {
    if (!doc.warehouseId || !doc.providerId) {
      alert("Оберіть склад та постачальника");
      return;
    }
    setSaving(true);
    try {
      let savedDoc;
      if (isNew) {
        savedDoc = await GoodsReceiptService.create(doc);
      } else {
        if (id) savedDoc = await GoodsReceiptService.update(id, doc);
      }

      if (savedDoc && post) {
        savedDoc = await GoodsReceiptService.post(savedDoc.id);
      }

      setDoc(savedDoc!);
      if (isNew) navigate(`/goods-receipt/${savedDoc!.id}`, { replace: true });

      alert(post ? "Документ проведено!" : "Документ збережено!");
    } catch (error: any) {
      console.error("Failed to save", error);
      alert(
        "Помилка збереження: " + (error.response?.data?.error || error.message),
      );
    } finally {
      setSaving(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setDoc((prev) => {
        const items = [...(prev.items || [])];
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return {
          ...prev,
          items: arrayMove(items, oldIndex, newIndex),
        };
      });
    }
  };

  if (loading) return <div className="p-8 text-center">Завантаження...</div>;

  const isPosted = doc.status === "POSTED";
  const totalAmount =
    doc.items?.reduce((sum, item) => sum + Number(item.total || 0), 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/goods-receipt")}
            className="mr-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold dark:text-white">
            {isNew ? "Нове Поступлення" : `Поступлення ${doc.number}`}
          </h1>
          <span
            className={`ml-4 px-3 py-1 text-sm font-semibold rounded-full 
                        ${doc.status === "POSTED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
          >
            {doc.status === "POSTED" ? "Проведено" : "Збережено"}
          </span>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => save(false)}
            disabled={saving}
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-white"
          >
            <Save className="mr-2" size={18} />
            <span className="hidden sm:inline">Зберегти</span>
          </button>
          {!isPosted && (
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <CheckCircle className="mr-2" size={18} />
              <span className="hidden sm:inline">Провести</span>
            </button>
          )}
        </div>
      </div>

      {/* Document Header Form */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Номер
          </label>
          <input
            type="text"
            value={doc.number || ""}
            onChange={(e) => handleHeaderChange("number", e.target.value)}
            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Дата
          </label>
          <input
            type="datetime-local"
            value={doc.date ? doc.date.slice(0, 16) : ""}
            onChange={(e) => handleHeaderChange("date", e.target.value)}
            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Постачальник
          </label>
          <select
            value={doc.providerId || ""}
            onChange={(e) => handleHeaderChange("providerId", e.target.value)}
            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Оберіть постачальника</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Склад
          </label>
          <select
            value={doc.warehouseId || ""}
            onChange={(e) => handleHeaderChange("warehouseId", e.target.value)}
            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Оберіть склад</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Тип Ціни
          </label>
          <select
            value={doc.priceTypeId || ""}
            onChange={(e) => handlePriceTypeChange(e.target.value)}
            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Без авто-ціни</option>
            {priceTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-full">
          <label className="block text-sm font-medium mb-1 dark:text-gray-300">
            Коментар
          </label>
          <textarea
            value={doc.comment || ""}
            onChange={(e) => handleHeaderChange("comment", e.target.value)}
            rows={2}
            className="w-full rounded-md border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left w-10"></th>
                  <th className="px-4 py-3 text-left min-w-[200px]">Товар</th>
                  <th className="px-4 py-3 text-right w-32 min-w-[100px]">
                    Кількість
                  </th>
                  <th className="px-4 py-3 text-right w-32 min-w-[100px]">
                    Ціна
                  </th>
                  <th className="px-4 py-3 text-right w-32 min-w-[100px]">
                    Сума
                  </th>
                  <th className="px-4 py-3 w-16"></th>
                </tr>
              </thead>
              <SortableContext
                items={(doc.items || []).map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {doc.items?.map((item, index) => (
                    <SortableRow
                      key={item.id}
                      item={item}
                      index={index}
                      products={products}
                      handleItemChange={handleItemChange}
                      removeItem={removeItem}
                    />
                  ))}
                </tbody>
              </SortableContext>
              <tfoot className="bg-gray-50 dark:bg-gray-900 font-bold">
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-3 text-right dark:text-white"
                  >
                    Всього:
                  </td>
                  <td className="px-4 py-3 text-right dark:text-white">
                    {totalAmount.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </DndContext>
        </div>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white"></h3>
            <button
              onClick={addItem}
              className="flex items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
            >
              <Plus size={18} className="mr-2" />
              Додати товар (підбір)
            </button>
          </div>
        </div>
      </div>

      <ProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        products={products}
        onSelect={(prod) => setSelectedProductForQty(prod)}
        priceSlug={priceSlug}
        addedItemsMap={(doc.items || []).reduce((acc, item) => {
          acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
          return acc;
        }, {} as Record<string, number>)}
      />

      <QuantityModal
        isOpen={selectedProductForQty !== null}
        onClose={() => setSelectedProductForQty(null)}
        product={selectedProductForQty}
        price={(() => {
          if (!selectedProductForQty) return 0;
          if (doc.priceTypeId && selectedProductForQty.prices && selectedProductForQty.prices[priceSlug] !== undefined) {
            return Number(selectedProductForQty.prices[priceSlug]);
          }
          return 0;
        })()}
        isPriceMissing={false}
        stockBalance={null}
        onConfirm={handleConfirmQuantity}
      />
    </div>
  );
}
