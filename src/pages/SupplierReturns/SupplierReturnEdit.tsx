import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supplierReturnService as SupplierReturnService, type SupplierReturn } from "../../services/supplierReturnService";
import OrderForm from "../../components/OrderForm";

export default function SupplierReturnEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [supplierReturn, setSupplierReturn] = useState<SupplierReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await SupplierReturnService.getById(id);
      setSupplierReturn(data);
    } catch (error) {
      console.error("Failed to load supplier return", error);
      alert(t("common.error", "Failed to load return"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any, action?: "save" | "saveAndPost") => {
    if (!id) return;
    setSaving(true);
    try {
      // Transform OrderForm data structure back to SupplierReturn structure
      const payload = {
        date: data.date,
        supplierId: data.counterpartyId,
        status: data.status,
        warehouseId: data.warehouseId,
        totalAmount: data.amount, // OrderForm gives us `amount`, DB expects `totalAmount`
        comment: data.comment,
        items: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      };

      await SupplierReturnService.update(id, payload);

      if (action === "saveAndPost") {
        await SupplierReturnService.postDocument(id);
        navigate("/supplier-returns", { state: { highlight: id } });
      } else {
        alert(t("common.saved", "Збережено успішно"));
        // loadData(); // Optionally refresh if we want clean DB state
      }
    } catch (error) {
      console.error("Failed to update supplier return", error);
      alert(t("common.error", "Failed to update return"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );
  if (!supplierReturn)
    return (
      <div className="p-8 text-center text-red-500">Return not found</div>
    );

  if (supplierReturn.status === "POSTED") {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">
          Cannot edit a posted document.
        </p>
        <button
          onClick={() => navigate(`/supplier-returns/${id}`)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
        >
          {t("common.back", "Back")}
        </button>
      </div>
    );
  }

  return (
    <OrderForm
      initialData={{...supplierReturn, amount: supplierReturn.totalAmount, counterpartyId: supplierReturn.supplierId} as any}
      onSubmit={handleSubmit}
      saving={saving}
      title={"Редагування Повернення постачальнику"}
      isRealization={false} 
    />
  );
}
