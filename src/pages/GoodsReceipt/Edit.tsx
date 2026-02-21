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
import { GoodsReceiptService } from "../../services/goodsReceipt.service";
import { ProductsService } from "../../services/products.service";
import { OrganizationService } from "../../services/organization.service";
import { CounterpartyService } from "../../services/counterparty.service";
import { PriceTypesService } from "../../services/priceTypes.service";

import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { GoodsReceipt, GoodsReceiptItem } from "../../types/goodsReceipt";
import type { Product } from "../../types/product";
import type { Warehouse } from "../../types/organization";
import type { Counterparty } from "../../types/counterparty";
import type { PriceType } from "../../types/priceType";

function SortableRow({
  id,
  disabled,
  children,
}: {
  id: string;
  disabled: boolean;
  children: (listeners: any) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id, disabled });

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
        setDoc(await GoodsReceiptService.getById(id));
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

  const isPosted = doc.status === "POSTED";

  const handleDragEnd = (event: any) => {
    if (isPosted) return;

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDoc((prev) => {
      const items = prev.items || [];
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      return { ...prev, items: arrayMove(items, oldIndex, newIndex) };
    });
  };

  if (loading) return <div className="p-8 text-center">Завантаження...</div>;

  const totalAmount =
    doc.items?.reduce((sum, i) => sum + Number(i.total || 0), 0) || 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* TABLE */}
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="w-8"></th>
            <th className="w-10 text-center">#</th>
            <th>Товар</th>
            <th className="text-right">Кількість</th>
            <th className="text-right">Ціна</th>
            <th className="text-right">Сума</th>
            <th className="w-12"></th>
          </tr>
        </thead>

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={doc.items?.map((i) => i.id) || []}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {doc.items?.map((item, index) => (
                <SortableRow key={item.id} id={item.id} disabled={isPosted}>
                  {(listeners) => (
                    <>
                      <td className="text-center">
                        {!isPosted && (
                          <span
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing inline-block"
                          >
                            <GripVertical size={16} />
                          </span>
                        )}
                      </td>
                      <td className="text-center">{index + 1}</td>
                      <td>{item.productId}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{item.price}</td>
                      <td className="text-right">{item.total}</td>
                      <td className="text-center">
                        {!isPosted && (
                          <Trash2
                            size={16}
                            className="text-red-500 cursor-pointer"
                          />
                        )}
                      </td>
                    </>
                  )}
                </SortableRow>
              ))}
            </tbody>
          </SortableContext>
        </DndContext>

        <tfoot className="bg-gray-50 dark:bg-gray-900 font-bold">
          <tr>
            <td colSpan={5} className="text-right px-4">
              Всього:
            </td>
            <td className="text-right px-4">{totalAmount.toFixed(2)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
