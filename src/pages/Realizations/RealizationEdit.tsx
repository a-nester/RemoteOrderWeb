import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RealizationService } from "../../services/realization.service";
import type { Realization } from "../../types/realization";
import OrderForm from "../../components/OrderForm";

export default function RealizationEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [realization, setRealization] = useState<Realization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await RealizationService.getById(id);
      setRealization(data);
    } catch (error) {
      console.error("Failed to load realization", error);
      alert(t("common.error", "Failed to load realization"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any, action?: "save" | "saveAndPost") => {
    if (!id) return;
    setSaving(true);
    try {
      // Transform OrderForm data structure back to Realization structure
      const payload = {
        date: data.date,
        counterpartyId: data.counterpartyId,
        status: data.status, // OrderForm includes status, although we could ignore it for realizations
        warehouseId: data.warehouseId,
        amount: data.amount,
        comment: data.comment,
        items: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          sellPrice: item.price, // Map 'price' back to 'sellPrice' or just use 'price' as expected by our PUT endpoint
          price: item.price,
          total: item.total,
        })),
      };

      await RealizationService.update(id, payload);

      if (action === "saveAndPost") {
        await RealizationService.postRealization(id);
        navigate("/realizations");
      } else {
        alert(t("common.saved", "Збережено успішно"));
        // loadData(); // Optionally refresh if we want clean DB state
      }
    } catch (error) {
      console.error("Failed to update realization", error);
      alert(t("common.error", "Failed to update realization"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );
  if (!realization)
    return (
      <div className="p-8 text-center text-red-500">Realization not found</div>
    );

  if (realization.status === "POSTED") {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">
          {t(
            "realization.cannotEditPosted",
            "Cannot edit a posted realization.",
          )}
        </p>
        <button
          onClick={() => navigate(`/realizations/${id}`)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white"
        >
          {t("common.back", "Back")}
        </button>
      </div>
    );
  }

  return (
    <OrderForm
      initialData={realization as any}
      onSubmit={handleSubmit}
      saving={saving}
      title={t("realization.edit", "Редагування Реалізації")}
    />
  );
}
