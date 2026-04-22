import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supplierReturnService as SupplierReturnService } from "../../services/supplierReturnService";
import OrderForm from "../../components/OrderForm";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { ErrorModal } from "../../components/ui/ErrorModal";

export default function SupplierReturnCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(!!searchParams.get("copyFrom"));
  
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorModalOpen(true);
  };

  useEffect(() => {
    const copyFrom = searchParams.get("copyFrom");
    if (copyFrom) {
      SupplierReturnService.getById(copyFrom)
        .then((doc) => {
          // Strip ID and set status string
          const { id, number, status, ...rest } = doc as any;
          setInitialData({
            ...rest,
            counterpartyId: rest.supplierId, // map to OrderForm mapping
            amount: rest.totalAmount, // OrderForm expects amount
            status: "NEW", // Ensure correct initial status
            date: new Date().toISOString(),
          });
        })
        .catch((err) =>
          console.error("Failed to fetch supplier return to copy", err),
        )
        .finally(() => setLoading(false));
    }
  }, [searchParams]);

  const handleSubmit = async (data: any, action?: "save" | "saveAndPost") => {
    setSaving(true);
    try {
      const payload = {
        date: data.date,
        supplierId: data.counterpartyId,
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

      const res = await SupplierReturnService.create(payload);

      if (action === "saveAndPost") {
        try {
          await SupplierReturnService.postDocument(res.id);
          navigate("/supplier-returns", { state: { highlight: res.id } });
        } catch (postError: any) {
          console.error("Failed to post supplier return", postError);
          const errorMsg = postError.response?.data?.error?.message || 
                           postError.response?.data?.error || 
                           postError.message || 
                           "Невідома помилка проведення";
                           
          // Safely switch to edit mode to prevent duplicate document creations!
          navigate(`/supplier-returns/${res.id}/edit`, { 
            state: { postError: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg) } 
          });
        }
      } else {
        navigate(`/supplier-returns/${res.id}/edit`);
      }
    } catch (error: any) {
      console.error("Failed to create supplier return", error);
      const msg = error.response?.data?.error?.message || error.response?.data?.error || error.message || "Помилка створення документа";
      showError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
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
        title={"Створення Повернення постачальнику"}
        isRealization={false} // Different logic might apply if we need it
        isSupplierReturn={true}
      />
      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        errorMessage={errorMessage}
        title="Помилка збереження"
      />
    </ErrorBoundary>
  );
}
