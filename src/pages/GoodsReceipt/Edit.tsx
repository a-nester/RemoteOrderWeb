import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Trash2, GripVertical } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/* ================= TYPES ================= */

interface GoodsReceiptItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
}

interface GoodsReceipt {
  id?: string;
  number?: string;
  date: string;
  status: string;
  warehouseId?: string;
  providerId?: string;
  items: GoodsReceiptItem[];
}

interface Product {
  id: string;
  name: string;
}

interface Warehouse {
  id: string;
  name: string;
}

interface Counterparty {
  id: string;
  name: string;
}

/* ================= SORTABLE ROW ================= */

function SortableRow({
  item,
  index,
  products,
  isPosted,
  onChange,
  onRemove,
}: {
  item: GoodsReceiptItem;
  index: number;
  products: Product[];
  isPosted: boolean;
  onChange: (index: number, field: keyof GoodsReceiptItem, value: any) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      <td
        className="px-2 text-center text-gray-400 cursor-grab"
        {...listeners}
        {...attributes}
      >
        <GripVertical size={16} />
      </td>

      <td className="px-4 py-2 text-center text-gray-500">{index + 1}</td>

      <td className="px-4 py-2">
        <select
          value={item.productId}
          onChange={(e) => onChange(index, "productId", e.target.value)}
          disabled={isPosted}
          className="w-full rounded border-gray-300 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        >
          <option value="">Оберіть товар</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </td>

      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          step="0.001"
          value={item.quantity}
          onChange={(e) => onChange(index, "quantity", Number(e.target.value))}
          disabled={isPosted}
          className="w-full rounded border-gray-300 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </td>

      <td className="px-4 py-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={item.price}
          onChange={(e) => onChange(index, "price", Number(e.target.value))}
          disabled={isPosted}
          className="w-full rounded border-gray-300 text-sm text-right dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </td>

      <td className="px-4 py-2 text-right font-medium dark:text-white">
        {item.total.toFixed(2)}
      </td>

      <td className="px-4 py-2 text-center">
        {!isPosted && (
          <button onClick={() => onRemove(index)} className="text-red-500">
            <Trash2 size={18} />
          </button>
        )}
      </td>
    </tr>
  );
}

/* ================= PAGE ================= */

export default function EditGoodsReceipt() {
  const { id } = useParams();

  const [doc, setDoc] = useState<GoodsReceipt>({
    date: new Date().toISOString(),
    status: "SAVED",
    items: [],
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [providers, setProviders] = useState<Counterparty[]>([]);

  const isPosted = doc.status === "POSTED";

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    // ⬇️ тут у тебе будуть реальні API
    setProducts([]);
    setWarehouses([]);
    setProviders([]);
  }, [id]);

  /* ================= HANDLERS ================= */

  const handleHeaderChange = (field: keyof GoodsReceipt, value: any) => {
    setDoc((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (
    index: number,
    field: keyof GoodsReceiptItem,
    value: any,
  ) => {
    setDoc((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        [field]: value,
        total:
          field === "quantity" || field === "price"
            ? Number(
                (field === "quantity" ? value : items[index].quantity) *
                  (field === "price" ? value : items[index].price),
              )
            : items[index].total,
      };
      return { ...prev, items };
    });
  };

  const removeItem = (index: number) => {
    setDoc((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const onDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDoc((prev) => {
      const oldIndex = prev.items.findIndex((i) => i.id === active.id);
      const newIndex = prev.items.findIndex((i) => i.id === over.id);
      return { ...prev, items: arrayMove(prev.items, oldIndex, newIndex) };
    });
  };

  /* ================= RENDER ================= */

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-6">
        Прихід товарів {doc.number}
      </h1>

      {/* HEADER */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Дата</label>
          <input
            type="date"
            value={doc.date.slice(0, 10)}
            onChange={(e) => handleHeaderChange("date", e.target.value)}
            className="w-full border rounded px-2 py-1"
            disabled={isPosted}
          />
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">Склад</label>
          <select
            value={doc.warehouseId || ""}
            onChange={(e) => handleHeaderChange("warehouseId", e.target.value)}
            className="w-full border rounded px-2 py-1"
            disabled={isPosted}
          >
            <option value="">— Оберіть склад —</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-500 mb-1">
            Постачальник
          </label>
          <select
            value={doc.providerId || ""}
            onChange={(e) => handleHeaderChange("providerId", e.target.value)}
            className="w-full border rounded px-2 py-1"
            disabled={isPosted}
          >
            <option value="">— Оберіть постачальника —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ITEMS TABLE */}
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext
          items={doc.items.map((i) => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <tbody>
              {doc.items.map((item, index) => (
                <SortableRow
                  key={item.id}
                  item={item}
                  index={index}
                  products={products}
                  isPosted={isPosted}
                  onChange={handleItemChange}
                  onRemove={removeItem}
                />
              ))}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>
    </div>
  );
}
