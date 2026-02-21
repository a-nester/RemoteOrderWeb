import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  CheckCircle,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
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

/* ---------------- Sortable Row ---------------- */
function SortableRow({
  id,
  children,
}: {
  id: string;
  children: (listeners: any) => React.ReactNode;
}) {
  const { setNodeRef, transform, transition, listeners, attributes } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <tr ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </tr>
  );
}

export default function GoodsReceiptEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [providers, setProviders] = useState<Counterparty[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

  const [doc, setDoc] = useState<Partial<GoodsReceipt>>({
    date: new Date().toISOString(),
    status: "SAVED",
    items: [],
  });

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
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
      } else {
        setDoc((prev) => ({
          ...prev,
          number: `GR-${Date.now().toString().slice(-6)}`,
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleHeaderChange = (field: keyof GoodsReceipt, value: any) => {
    setDoc((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (
    index: number,
    field: keyof GoodsReceiptItem,
    value: any,
  ) => {
    const items = [...(doc.items || [])];
    const item = { ...items[index], [field]: value };

    if (field === "productId" && doc.priceTypeId) {
      const product = products.find((p) => p.id === value);
      const type = priceTypes.find((t) => t.id === doc.priceTypeId);
      if (product && type && product.prices) {
        item.price = Number(product.prices[type.slug]) || 0;
      }
    }

    item.total = Number(item.quantity || 0) * Number(item.price || 0);
    items[index] = item;

    setDoc((prev) => ({ ...prev, items }));
  };

  const addItem = () => {
    setDoc((prev) => ({
      ...prev,
      items: [
        ...(prev.items || []),
        {
          id: crypto.randomUUID(),
          productId: "",
          quantity: 1,
          price: 0,
          total: 0,
        },
      ],
    }));
  };

  const removeItem = (index: number) => {
    const items = [...(doc.items || [])];
    items.splice(index, 1);
    setDoc((prev) => ({ ...prev, items }));
  };

  const save = async (post = false) => {
    if (!doc.warehouseId || !doc.providerId) {
      alert("Оберіть склад та постачальника");
      return;
    }

    setSaving(true);
    try {
      let saved;
      if (isNew) saved = await GoodsReceiptService.create(doc);
      else if (id) saved = await GoodsReceiptService.update(id, doc);

      if (saved && post) saved = await GoodsReceiptService.post(saved.id);

      setDoc(saved!);
      if (isNew) navigate(`/goods-receipt/${saved!.id}`, { replace: true });

      alert(post ? "Документ проведено!" : "Документ збережено!");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Завантаження...</div>;

  const isPosted = doc.status === "POSTED";
  const totalAmount =
    doc.items?.reduce((s, i) => s + Number(i.total || 0), 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate("/goods-receipt")}
            className="mr-4 p-2"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-2xl font-bold">
            {isNew ? "Нове Поступлення" : `Поступлення ${doc.number}`}
          </h1>
        </div>

        {!isPosted && (
          <div className="flex gap-2">
            <button onClick={() => save(false)} disabled={saving}>
              <Save />
            </button>
            <button onClick={() => save(true)} disabled={saving}>
              <CheckCircle />
            </button>
          </div>
        )}
      </div>

      {/* ITEMS */}
      <table className="min-w-full divide-y">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={({ active, over }) => {
            if (!over || active.id === over.id) return;
            setDoc((prev) => ({
              ...prev,
              items: arrayMove(
                prev.items || [],
                prev.items!.findIndex((i) => i.id === active.id),
                prev.items!.findIndex((i) => i.id === over.id),
              ),
            }));
          }}
        >
          <SortableContext
            items={doc.items?.map((i) => i.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {doc.items?.map((item, index) => (
                <SortableRow key={item.id} id={item.id}>
                  {(listeners) => (
                    <>
                      <td {...listeners} className="cursor-grab px-2">
                        <GripVertical size={16} />
                      </td>
                      <td>{index + 1}</td>
                      <td>{item.total}</td>
                      <td>
                        <button onClick={() => removeItem(index)}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </>
                  )}
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>

      {!isPosted && (
        <button onClick={addItem} className="mt-4 flex items-center">
          <Plus size={18} className="mr-1" />
          Додати рядок
        </button>
      )}

      <div className="mt-4 font-bold">Всього: {totalAmount.toFixed(2)}</div>
    </div>
  );
}
