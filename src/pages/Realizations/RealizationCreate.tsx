import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RealizationService } from "../../services/realization.service";
import OrderForm from "../../components/OrderForm";
import { ErrorBoundary } from "../../components/ErrorBoundary";

export default function RealizationCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data: any, action?: "save" | "saveAndPost") => {
    setSaving(true);
    try {
      const payload = {
        date: data.date,
        counterpartyId: data.counterpartyId,
        warehouseId: data.warehouseId,
        amount: data.amount,
        comment: data.comment,
        items: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      };

      const res = await RealizationService.create(payload);

      if (action === "saveAndPost") {
        await RealizationService.postRealization(res.id);
        navigate("/realizations");
      } else {
        navigate(`/realizations/${res.id}/edit`);
      }
    } catch (error) {
      console.error("Failed to create realization", error);
      alert(t("common.error", "Failed to create realization"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ErrorBoundary>
      <OrderForm
        onSubmit={handleSubmit}
        saving={saving}
        title={t("realization.create", "Створення Реалізації")}
        isRealization={true}
      />
    </ErrorBoundary>
  );
}
