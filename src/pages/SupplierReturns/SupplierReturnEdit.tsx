import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation as useReactRouterLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supplierReturnService as SupplierReturnService, type SupplierReturn } from "../../services/supplierReturnService";
import OrderForm from "../../components/OrderForm";
import { ErrorModal } from "../../components/ui/ErrorModal";

export default function SupplierReturnEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useReactRouterLocation();
  const { t } = useTranslation();
  const [supplierReturn, setSupplierReturn] = useState<SupplierReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setErrorModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.postError) {
      showError(location.state.postError);
      // Clean up state so refresh doesn't trigger it again
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

      const updatedDoc = await SupplierReturnService.update(id, payload);

      if (action === "saveAndPost") {
        try {
          await SupplierReturnService.postDocument(id);
          navigate("/supplier-returns", { state: { highlight: id } });
        } catch (postError: any) {
          console.error("Failed to post supplier return", postError);
          const errorMsg = postError.response?.data?.error?.message || 
                           postError.response?.data?.error || 
                           postError.message || 
                           "Невідома помилка проведення";
          showError(typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : String(errorMsg));
          setSupplierReturn(updatedDoc); // Ensure UI doesn't lose items on error
        }
      } else {
        alert(t("common.saved", "Збережено успішно"));
        setSupplierReturn(updatedDoc); // Update state to prevent OrderForm from reverting to old initialData and clearing items
      }
    } catch (error: any) {
      console.error("Failed to update supplier return", error);
      const msg = error.response?.data?.error?.message || error.response?.data?.error || error.message || "Помилка збереження документа";
      showError(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
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
    <>
      <OrderForm
        initialData={{...supplierReturn, amount: supplierReturn.totalAmount, counterpartyId: supplierReturn.supplierId} as any}
        onSubmit={handleSubmit}
        saving={saving}
        title={"Редагування Повернення постачальнику"}
        isRealization={false} 
        isSupplierReturn={true}
      />
      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        errorMessage={errorMessage}
        title="Помилка збереження"
      />
    </>
  );
}
