import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer, Edit, CheckCircle } from "lucide-react";
import { RealizationService } from "../../services/realization.service";
import type { Realization } from "../../types/realization";
import { numberToWordsUk } from "../../utils/numberToWords";

export default function RealizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [realization, setRealization] = useState<Realization | null>(null);
  const [loading, setLoading] = useState(true);

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
          "Ви впевнені, що хочете провести реалізацію? Це спише товари зі складу.",
        ),
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      await RealizationService.postRealization(id);
      await loadData(); // Reload to get updated status and profit
    } catch (error: any) {
      console.error("Failed to post realization", error);
      alert(
        error.response?.data?.message ||
          t("common.error", "Failed to post realization"),
      );
      setLoading(false);
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

  const isPosted = realization.status === "POSTED";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg print:shadow-none print:w-full print:m-0 print:p-0">
      {/* Header / Actions */}
      <div className="flex justify-between items-center mb-8 print:hidden">
        <button
          onClick={() => navigate("/realizations")}
          className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <ArrowLeft className="mr-2" size={20} />
          {t("common.back", "Back")}
        </button>
        <div className="flex items-center space-x-4">
          {!isPosted && (
            <>
              <button
                onClick={() => navigate(`/realizations/${id}/edit`)}
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
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Printer className="mr-2" size={20} />
            {t("common.print", "Print")}
          </button>
        </div>
      </div>

      {/* Content */}
      <div id="realization-print-area">
        <div className="border-b pb-6 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {t("menu.realizations", "Видаткова накладна")}
            </h1>
            <p className="text-gray-500">#{realization.number}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              RemoteOrder Inc.
            </p>
            <p className="text-sm text-gray-500">
              {t("common.date", "Date")}:{" "}
              {new Date(realization.date).toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-gray-500 uppercase text-xs font-semibold tracking-wider mb-2">
              {t("print.supplier", "Supplier")}
            </h3>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              МілКрай
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {realization.warehouseName}
            </p>
          </div>
          <div>
            <h3 className="text-gray-500 uppercase text-xs font-semibold tracking-wider mb-2">
              {t("print.recipient", "Recipient")}
            </h3>
            <p className="text-lg font-bold text-gray-900 dark:text-white">
              {realization.counterpartyName}
            </p>
          </div>
        </div>

        <table className="min-w-full mb-8">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 text-left text-gray-600 dark:text-gray-400">
                #
              </th>
              <th className="py-2 text-left text-gray-600 dark:text-gray-400">
                {t("common.item", "Item")}
              </th>
              <th className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t("print.qty", "Qty")}
              </th>
              <th className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t("print.price", "Price")}
              </th>
              <th className="py-2 text-right text-gray-600 dark:text-gray-400">
                {t("common.total", "Total")}
              </th>
            </tr>
          </thead>
          <tbody>
            {realization.items?.map((item, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 dark:border-gray-700"
              >
                <td className="py-2 text-gray-500">{i + 1}</td>
                <td className="py-2 dark:text-gray-300">
                  {item.productName || item.productId}
                </td>
                <td className="py-2 text-right dark:text-gray-300">
                  {Number(item.quantity).toFixed(3)}
                </td>
                <td className="py-2 text-right dark:text-gray-300">
                  {Number(item.price).toFixed(2)}
                </td>
                <td className="py-2 text-right dark:text-gray-300">
                  {Number(item.total).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right font-bold text-xl dark:text-white mb-4">
          {t("print.total", "Total")}: {Number(realization.amount).toFixed(2)}{" "}
          {realization.currency}
        </div>
        <div className="border-t pt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>
            {t("print.totalSum", "Total sum")}:{" "}
            {numberToWordsUk(realization.amount)}
          </p>
        </div>
      </div>

      {/* Print Mode (Specific Layout from Reference) */}
      <div
        id="realization-print-area"
        className="hidden print:block text-black bg-white p-4"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header Section */}
        <div className="mb-6 text-sm">
          <div className="flex mb-2">
            <div className="w-40 font-bold italic text-left">
              {t("print.supplier", "Постачальник")}
            </div>
            <div className="text-left">МілКрай</div>
          </div>
          <div className="flex mb-2">
            <div className="w-40 font-bold underline text-left">
              {t("print.recipient", "Одержувач")}
            </div>
            <div className="text-left">{realization.counterpartyName}</div>
          </div>
          <div className="flex mb-2">
            <div className="w-40 font-bold underline text-left">
              {t("print.saleCondition", "Умова продажу")}
            </div>
            <div className="text-left">
              {t("print.cash", "Готівковий розрахунок")}
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <div className="text-lg font-bold">
            Видаткова накладна №{realization.number}
          </div>
          <div className="font-bold">
            від {formatDateForPrint(realization.date)}
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-black mb-6 text-sm">
          <thead>
            <tr>
              <th className="border border-black p-1 text-center font-normal w-10">
                №
              </th>
              <th className="border border-black p-1 text-left font-normal">
                Товар
              </th>
              <th className="border border-black p-1 text-center font-normal w-12">
                Од.
              </th>
              <th className="border border-black p-1 text-center font-normal w-20">
                Кількість
              </th>
              <th className="border border-black p-1 text-center font-normal w-24">
                Ціна
              </th>
              <th className="border border-black p-1 text-center font-normal w-24">
                Сума
              </th>
            </tr>
          </thead>
          <tbody>
            {(realization.items || []).map((item: any, index: number) => (
              <tr key={index}>
                <td className="border border-black p-1 text-center">
                  {index + 1}
                </td>
                <td className="border border-black p-1 text-left">
                  {item.productName || item.productId}
                </td>
                <td className="border border-black p-1 text-center">
                  {item.unit || "шт"}
                </td>
                <td className="border border-black p-1 text-right">
                  {Number(item.quantity).toFixed(0)}
                </td>
                <td className="border border-black p-1 text-right">
                  {Number(item.price).toFixed(2)}
                </td>
                <td className="border border-black p-1 text-right">
                  {Number(item.total).toFixed(2)}
                </td>
              </tr>
            ))}
            {/* Total Row in Table */}
            <tr>
              <td colSpan={5} className="border border-black p-1 text-right">
                Всього:
              </td>
              <td className="border border-black p-1 text-right">
                {Number(realization.amount || 0).toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footer Sum */}
        <div className="mb-8 text-sm">
          <div className="mb-1">Всього на суму:</div>
          <div className="">{numberToWordsUk(realization.amount)}</div>
        </div>

        {/* Signatures */}
        <div className="flex justify-between mt-12 text-sm">
          <div className="flex items-end">
            <span className="mr-2">Від постачальника</span>
            <div className="border-b border-black w-48 h-4"></div>
          </div>
          <div className="flex items-end">
            <span className="mr-2">Отримав(ла)</span>
            <div className="border-b border-black w-48 h-4"></div>
          </div>
        </div>
      </div>

      <style>
        {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        #realization-print-area, #realization-print-area * {
                            visibility: visible;
                        }
                        #realization-print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            z-index: 9999;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                    }
                `}
      </style>
    </div>
  );
}
