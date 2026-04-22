import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buyerReturnService as BuyerReturnService, type BuyerReturn } from "../../services/buyerReturnService";
import OrderForm from "../../components/OrderForm";

export default function BuyerReturnEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [buyerReturn, setBuyerReturn] = useState<BuyerReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await BuyerReturnService.getById(id);
      setBuyerReturn(data);
    } catch (error) {
      console.error("Failed to load buyer return", error);
      alert(t("common.error", "Failed to load buyer return"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any, action?: "save" | "saveAndPost") => {
    if (!id) return;
    setSaving(true);
    try {
      // Transform OrderForm data structure back to BuyerReturn structure
      const payload = {
        date: data.date,
        counterpartyId: data.counterpartyId,
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

      const updatedDoc = await BuyerReturnService.update(id, payload);

      if (action === "saveAndPost") {
        await BuyerReturnService.postDocument(id);
        navigate("/buyer-returns", { state: { highlight: id } });
      } else {
        alert(t("common.saved", "Збережено успішно"));
        setBuyerReturn(updatedDoc);
      }
    } catch (error) {
      console.error("Failed to update buyer return", error);
      alert(t("common.error", "Failed to update buyer return"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );
  if (!buyerReturn)
    return (
      <div className="p-8 text-center text-red-500">Buyer return not found</div>
    );

  if (buyerReturn.status === "POSTED") {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">
          Cannot edit a posted document.
        </p>
        <button
          onClick={() => navigate(`/buyer-returns/${id}`)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
        >
          {t("common.back", "Back")}
        </button>
      </div>
    );
  }

  return (
    <OrderForm
      initialData={{...buyerReturn, amount: buyerReturn.totalAmount} as any}
      onSubmit={handleSubmit}
      saving={saving}
      title={"Редагування Повернення від Покупця"}
      isRealization={true} // Re-using OrderForm for editing items behavior
    />
  );
}
