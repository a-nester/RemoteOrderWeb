import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OrderService } from "../../services/order.service";
import OrderForm from "../../components/OrderForm";
import { OrderStatus } from "../../types/order";

export default function OrderCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(!!searchParams.get("copyFrom"));

  useEffect(() => {
    const copyFrom = searchParams.get("copyFrom");
    if (copyFrom) {
      OrderService.getOrder(copyFrom)
        .then((doc) => {
          // Strip ID and set status to NEW
          const { id, number, ...rest } = doc as any;
          setInitialData({
            ...rest,
            status: OrderStatus.NEW,
            date: new Date().toISOString(),
          });
        })
        .catch((err) => console.error("Failed to fetch order to copy", err))
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  const handleSubmit = async (data: any, action?: "save" | "saveAndPost") => {
    setSaving(true);
    try {
      const payload = { ...data };
      if (action === "saveAndPost") {
        payload.status = OrderStatus.ACCEPTED;
      }
      const res = await OrderService.createOrder(payload);
      if (action === "saveAndPost") {
        navigate("/orders", { state: { highlight: res.id } });
      } else {
        navigate(`/orders/${res.id}/edit`);
      }
    } catch (error) {
      console.error("Failed to save order", error);
      alert(t("common.error", "Failed to save order"));
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8 text-center">{t("common.loading", "Loading...")}</div>
    );

  return (
    <OrderForm
      initialData={initialData}
      onSubmit={handleSubmit}
      saving={saving}
      title={t("order.create", "New Order")}
    />
  );
}
