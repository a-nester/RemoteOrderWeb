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

  const handleSubmit = async (data: any) => {
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

      await RealizationService.create(payload);
      navigate("/realizations");
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
