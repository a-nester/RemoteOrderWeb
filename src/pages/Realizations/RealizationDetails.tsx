import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer, Edit, CheckCircle, FileText, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { RealizationService } from "../../services/realization.service";
import type { Realization } from "../../types/realization";
import { numberToWordsUk } from "../../utils/numberToWords";

export default function RealizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [realization, setRealization] = useState<Realization | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState<{productName: string, needed: number, missing: number} | null>(null);

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
      const errData = error.response?.data?.error;
      
      if (errData && errData.code === 'INSUFFICIENT_STOCK') {
        setStockError({
          productName: errData.productName,
          needed: errData.needed,
          missing: errData.missing
        });
      } else {
        alert(
          errData || error.response?.data?.message ||
            t("common.error", "Failed to post realization"),
        );
      }
      setLoading(false);
    }
  };

  const handleUnpost = async () => {
    if (!id) return;

    if (
      !window.confirm(
        t(
          "realization.confirmUnpost",
          "Ви впевнені, що хочете розпровести реалізацію? Товари будуть повернуті на склад.",
        ),
      )
    ) {
      return;
    }

    setLoading(true);

    try {
      await RealizationService.unpostRealization(id);
      await loadData(); // перезавантажити статус і profit
    } catch (error: any) {
      console.log("UNPOST ERROR:", error.response?.data);
      alert(
        error.response?.data?.message ||
          t("common.error", "Failed to unpost realization"),
      );
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    const printArea = document.getElementById("realization-print-area");
    if (!printArea) return;

    // Temporarily show for canvas rendering
    printArea.classList.toggle("hidden");
    printArea.classList.toggle("print:block");
    
    try {
      const canvas = await html2canvas(printArea, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Накладна_${realization?.number || "нова"}.pdf`);
    } finally {
      printArea.classList.toggle("hidden");
      printArea.classList.toggle("print:block");
    }
  };

  const handleExportExcel = () => {
    if (!realization) return;
    
    const wsData: any[][] = [
      [`Видаткова накладна №${realization.number}`],
      [`від ${formatDateForPrint(realization.date)}`],
      [],
      ["Постачальник:", realization.organizationName || 'МілКрай'],
      ["Одержувач:", realization.counterpartyName],
      ["Умова продажу:", realization.salesType || "Готівковий розрахунок"],
      [],
      ["№", "Товар", "Кількість", "Ціна", "Сума"]
    ];

    realization.items?.forEach((item, index) => {
      wsData.push([
        index + 1,
        item.productName || item.productId,
        Number(item.quantity).toFixed(3),
        Number(item.price).toFixed(2),
        Number(item.total).toFixed(2)
      ]);
    });

    wsData.push([]);
    wsData.push(["", "", "", "Разом:", Number(realization.amount).toFixed(2) + " " + realization.currency]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Накладна");
    XLSX.writeFile(wb, `Накладна_${realization.number}.xlsx`);
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
    <>
      {/* Insufficient Stock Modal */}
      {stockError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-500 bg-opacity-75">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
              <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-2">Недостатньо товару на залишку</h3>
            <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-left space-y-2 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
                <p><span className="font-semibold text-gray-700 dark:text-gray-300">Товар:</span> {stockError.productName}</p>
                <p><span className="font-semibold text-gray-700 dark:text-gray-300">Необхідно для списання:</span> {stockError.needed}</p>
                <p><span className="font-semibold text-red-600 dark:text-red-400">Не вистачає:</span> {stockError.missing}</p>
            </div>
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setStockError(null)}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
              >
                Зрозуміло
              </button>
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={handleExportPDF}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 mx-2"
          >
            <FileText className="mr-2" size={20} />
            PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            <Download className="mr-2" size={20} />
            Excel
          </button>
        </div>

        {isPosted && (
          <button
            onClick={handleUnpost}
            className="flex items-center px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Розпровести
          </button>
        )}
      </div>

      {/* Content */}
      <div>
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
              {realization.organizationName || 'МілКрай'}
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
            <div className="text-left">{realization.organizationName || 'МілКрай'}</div>
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
              {realization.salesType || t("print.cash", "Готівковий розрахунок")}
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
                  {Number(item.quantity).toFixed(3)}
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
    </>
  );
}
