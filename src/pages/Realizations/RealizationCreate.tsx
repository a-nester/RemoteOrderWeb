import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RealizationService } from "../../services/realization.service";
import OrderForm from "../../components/OrderForm";
import { ErrorBoundary } from "../../components/ErrorBoundary";

export default function RealizationCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(!!searchParams.get("copyFrom"));

  useEffect(() => {
    const copyFrom = searchParams.get("copyFrom");
    if (copyFrom) {
      RealizationService.getById(copyFrom)
        .then((doc) => {
          // Strip ID and set status string (Realization uses string statuses but OrderForm maps them)
          const { id, number, status, ...rest } = doc as any;
          setInitialData({
            ...rest,
            status: "NEW", // Ensure correct initial status
            date: new Date().toISOString(),
          });
        })
        .catch((err) =>
          console.error("Failed to fetch realization to copy", err),
        )
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

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

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );

  return (
    <ErrorBoundary>
      <OrderForm
        initialData={initialData}
        onSubmit={handleSubmit}
        saving={saving}
        title={t("realization.create", "Створення Реалізації")}
        isRealization={true}
      />
    </ErrorBoundary>
  );
}
