import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer, Edit, CheckCircle } from "lucide-react";
import { supplierReturnService as SupplierReturnService } from "../../services/supplierReturnService";
import type { SupplierReturn } from "../../services/supplierReturnService";

export default function SupplierReturnDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [supplierReturn, setSupplierReturn] = useState<SupplierReturn | null>(null);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDateForPrint = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("uk-UA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }) + " р."
    );
  };

  const handlePost = async () => {
    if (!id) return;
    if (
      !window.confirm(
        t(
          "realization.confirmPost",
          "Ви впевнені, що хочете провести документ? Це спише товари зі складу.",
        ),
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await SupplierReturnService.postDocument(id);
      await loadData(); // Reload to get updated status and profit
    } catch (error: any) {
      console.error("Failed to post return", error);
      alert(
        error.response?.data?.error ||
          t("common.error", "Failed to post return"),
      );
      setLoading(false);
    }
  };

  const handleUnpost = async () => {
    if (!id) return;

    if (
      !window.confirm(
        t(
          "realization.confirmUnpost",
          "Ви впевнені, що хочете розпровести документ? Товари будуть повернуті на склад.",
        ),
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      await SupplierReturnService.unpostDocument(id);
      await loadData();
    } catch (error: any) {
      console.log("UNPOST ERROR:", error.response?.data);
      alert(
        error.response?.data?.error ||
          t("common.error", "Failed to unpost return"),
      );
      setLoading(false);
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

  const isPosted = supplierReturn.status === "POSTED";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg print:shadow-none print:w-full print:m-0 print:p-0">
      {/* Header / Actions */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <button
          onClick={() => navigate("/supplier-returns")}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2" size={20} />
          {t("common.back", "Back")}
        </button>
        <div className="flex items-center space-x-4">
          {!isPosted && (
            <>
              <button
                onClick={() => navigate(`/supplier-returns/${id}/edit`)}
                className="flex items-center px-4 py-2 text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
              >
                <Edit className="mr-2" size={20} />
                {t("common.edit", "Edit")}
              </button>
              <button
                onClick={handlePost}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                <CheckCircle className="mr-2" size={20} />
                {t("action.post", "Провести")}
              </button>
            </>
          )}
          {isPosted && (
            <button
              onClick={handleUnpost}
              className="flex items-center px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Скасувати проведення
            </button>
          )}
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Printer className="mr-2" size={20} />
            {t("common.print", "Print")}
          </button>
        </div>
      </div>

      {/* Warning if draft */}
      {!isPosted && (
        <div className="mb-6 p-4 bg-yellow-50 text-yellow-800 rounded-md print:hidden">
          {t(
            "realization.draftWarning",
            "This return is a DRAFT and is not yet posted to the inventory.",
          )}
        </div>
      )}

      {/* Print Content */}
      <div className="print:block">

        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-white print:text-black">
          Повернення товару постачальнику № {supplierReturn.number} від {formatDateForPrint(supplierReturn.date)}
        </h1>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="text-gray-500 font-semibold mb-2">
              {t("common.customer", "Customer")}:
            </h3>
            <p className="text-lg font-bold text-gray-900 dark:text-white print:text-black">
              {supplierReturn.supplierName}
            </p>
          </div>
          <div>
            <h3 className="text-gray-500 font-semibold mb-2">
              {t("common.warehouse", "Warehouse")}:
            </h3>
            <p className="text-lg text-gray-900 dark:text-gray-300 print:text-black">
              {supplierReturn.warehouseName}
            </p>
          </div>
        </div>

        {/* Table */}
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 border dark:border-gray-700 print:border-black mb-6">
          <thead className="bg-gray-50 dark:bg-gray-900 print:bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider print:text-black border-r print:border-black">
                №
              </th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 tracking-wider print:text-black border-r print:border-black">
                {t("common.product", "Product")}
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 tracking-wider print:text-black border-r print:border-black">
                {t("common.quantity", "Quantity")}
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 tracking-wider print:text-black border-r print:border-black">
                {t("common.price", "Price")}
              </th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500 tracking-wider print:text-black">
                {t("common.total", "Total")}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700 print:bg-white print:divide-black border-b print:border-black">
            {supplierReturn.items?.map((item, index) => (
              <tr key={item.id || index}>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300 border-r print:border-black print:text-black">
                  {index + 1}
                </td>
                <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-300 border-r print:border-black print:text-black">
                  {item.productName}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-300 border-r print:border-black print:text-black">
                  {Number(item.quantity)}
                </td>
                <td className="px-4 py-2 text-sm text-right text-gray-900 dark:text-gray-300 border-r print:border-black print:text-black">
                  {Number(item.price).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-sm text-right font-medium text-gray-900 dark:text-gray-100 print:text-black">
                  {Number(item.total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50 dark:bg-gray-900 print:bg-gray-100">
            <tr>
              <td
                colSpan={4}
                className="px-4 py-2 text-sm font-bold text-right text-gray-900 dark:text-white print:text-black border-r print:border-black"
              >
                {t("common.total", "Всього")}:
              </td>
              <td className="px-4 py-2 text-sm font-bold text-right text-gray-900 dark:text-white print:text-black">
                {Number(supplierReturn.totalAmount).toFixed(2)} ₴
              </td>
            </tr>
          </tfoot>
        </table>

        {supplierReturn.comment && (
          <div className="mb-6">
            <h3 className="text-gray-500 font-semibold mb-1">
              Коментар:
            </h3>
            <p className="text-gray-900 dark:text-gray-300 print:text-black">
              {supplierReturn.comment}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
