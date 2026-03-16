import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { buyerReturnService as BuyerReturnService } from "../../services/buyerReturnService";
import OrderForm from "../../components/OrderForm";
import { ErrorBoundary } from "../../components/ErrorBoundary";

export default function BuyerReturnCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(!!searchParams.get("copyFrom"));

  useEffect(() => {
    const copyFrom = searchParams.get("copyFrom");
    if (copyFrom) {
      BuyerReturnService.getById(copyFrom)
        .then((doc) => {
          // Strip ID and set status string
          const { id, number, status, ...rest } = doc as any;
          setInitialData({
            ...rest,
            amount: rest.totalAmount, // OrderForm expects amount
            status: "NEW", // Ensure correct initial status
            date: new Date().toISOString(),
          });
        })
        .catch((err) =>
          console.error("Failed to fetch buyer return to copy", err),
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
        totalAmount: data.amount,
        comment: data.comment,
        items: data.items.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
      };

      const res = await BuyerReturnService.create(payload);

      if (action === "saveAndPost") {
        await BuyerReturnService.postDocument(res.id);
        navigate("/buyer-returns", { state: { highlight: res.id } });
      } else {
        navigate(`/buyer-returns/${res.id}/edit`);
      }
    } catch (error) {
      console.error("Failed to create buyer return", error);
      alert(t("common.error", "Failed to create buyer return"));
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
        title={"Створення Повернення від Покупця"}
        isRealization={true}
      />
    </ErrorBoundary>
  );
}
