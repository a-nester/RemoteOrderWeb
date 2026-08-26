import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Printer, Edit, CheckCircle, FileText, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { RealizationService } from "../../services/realization.service";
import { OrganizationService } from "../../services/organization.service";
import type { Realization } from "../../types/realization";
import type { Organization } from "../../types/organization";
import { numberToWordsUk } from "../../utils/numberToWords";

export default function RealizationDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [realization, setRealization] = useState<Realization | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockError, setStockError] = useState<{productName: string, needed: number, missing: number} | null>(null);

  useEffect(() => {
    loadData();
    OrganizationService.getOrganization().then(setOrganization).catch(console.error);
  }, [id]);

  const requisitesData = realization?.organizationRequisites || organization?.requisites;

  const activePrintedRequisites = useMemo(() => {
    if (!requisitesData) return [];
    const fields = requisitesData.printedFields || {};
    const list: Array<{ label: string; value: string }> = [];

    if (fields.edrpou && requisitesData.edrpou) {
      list.push({ label: "ЄДРПОУ", value: requisitesData.edrpou });
    }
    if (fields.tin && requisitesData.tin) {
      list.push({ label: "ІПН", value: requisitesData.tin });
    }
    if (fields.accountNumber && requisitesData.accountNumber) {
      list.push({ label: "Р/р", value: requisitesData.accountNumber });
    }
    if (fields.bankName && requisitesData.bankName) {
      list.push({ label: "Назва банку", value: requisitesData.bankName });
    }
    if (fields.certificateNumber && requisitesData.certificateNumber) {
      list.push({ label: "№ свідоцтва", value: requisitesData.certificateNumber });
    }
    if (fields.address && requisitesData.address) {
      list.push({ label: "Адреса", value: requisitesData.address });
    }
    return list;
  }, [requisitesData]);

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

  const getSaleConditionLabel = (salesType?: string) => {
    const effectiveType = salesType?.trim() || organization?.salesTypes?.[0]?.trim();
    if (effectiveType === 'р/р ФОП' || effectiveType === 'з ПДВ' || effectiveType === 'Безготівковий') {
      return 'Безготівковий розрахунок';
    }
    return 'Готівковий розрахунок';
  };

  const handleExportExcel = () => {
    if (!realization) return;
    
    const supplierInfo = [realization.organizationName || organization?.name || 'ПП «СМАКОСИР»'];
    if (activePrintedRequisites.length > 0) {
      supplierInfo.push(activePrintedRequisites.map(r => `${r.label}: ${r.value}`).join(', '));
    }

    const wsData: any[][] = [
      [`Видаткова накладна №${realization.number}`],
      [`від ${formatDateForPrint(realization.date)}`],
      [],
      ["Постачальник:", supplierInfo.join(' ')],
      ["Одержувач:", realization.counterpartyName],
      ["Умова продажу:", getSaleConditionLabel(realization.salesType)],
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

      {/* Print Mode (Aesthetic Ukrainian Realization Invoice Layout) */}
      {realization && (() => {
        const isVat = realization.salesType === 'з ПДВ';
        const totalAmount = Number(realization.amount || 0);
        const amountWithoutVat = isVat ? totalAmount / 1.2 : totalAmount;
        const vatAmount = isVat ? totalAmount - amountWithoutVat : 0;

        // Director & location helpers
        const directorName = organization?.fullDetails || 'Юрій Погребицький';
        const locationText = requisitesData?.placeOfIssue || requisitesData?.address || 'с. Пасіки';

        return (
          <div
            id="realization-print-area"
            className="hidden print:block text-black bg-white p-6 w-full max-w-none print:p-0 print:m-0 print:w-full"
            style={{ fontFamily: "'Times New Roman', Times, serif, Arial" }}
          >
            {/* Header Section */}
            <div className="mb-6 text-xs leading-relaxed space-y-1.5">
              {/* Supplier Row */}
              <div className="flex items-start">
                <div className="w-36 font-bold underline text-left shrink-0">
                  Постачальник
                </div>
                <div className="text-left font-medium text-black">
                  <div className="font-bold">{realization.organizationName || organization?.name || 'ПП «СМАКОСИР»'}</div>
                  {activePrintedRequisites.length > 0 && (
                    <div className="mt-0.5 space-y-0.5 font-normal text-[11px] text-gray-900">
                      {activePrintedRequisites.map((item) => (
                        <div key={item.label}>
                          <span className="font-semibold">{item.label}: </span>
                          <span>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipient Row */}
              <div className="flex items-center">
                <div className="w-36 font-bold underline text-left shrink-0">
                  Одержувач
                </div>
                <div className="text-left font-semibold text-black">
                  {realization.counterpartyName}
                </div>
              </div>

              {/* Payer Row */}
              <div className="flex items-center">
                <div className="w-36 font-bold underline text-left shrink-0">
                  Платник
                </div>
                <div className="text-left font-medium text-black">
                  той самий
                </div>
              </div>

              {/* Order Row */}
              <div className="flex items-center">
                <div className="w-36 font-bold underline text-left shrink-0">
                  Замовлення
                </div>
                <div className="text-left font-medium text-black">
                  {realization.comment ? `Замовлення ${realization.comment}` : 'Без замовлення'}
                </div>
              </div>

              {/* Sale Condition Row */}
              <div className="flex items-center">
                <div className="w-36 font-bold underline text-left shrink-0">
                  Умова продажу
                </div>
                <div className="text-left font-medium text-black">
                  {getSaleConditionLabel(realization.salesType)}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6">
              <h1 className="text-lg font-bold text-black tracking-tight">
                Видаткова накладна № {realization.number}
              </h1>
              <div className="text-sm font-bold text-black mt-0.5">
                від {formatDateForPrint(realization.date)}
              </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black mb-4 text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1.5 text-center font-bold w-8">
                    №
                  </th>
                  <th className="border border-black p-1.5 text-left font-bold">
                    Товар
                  </th>
                  <th className="border border-black p-1.5 text-center font-bold w-12">
                    Од.
                  </th>
                  <th className="border border-black p-1.5 text-right font-bold w-20">
                    Кількість
                  </th>
                  <th className="border border-black p-1.5 text-right font-bold w-24">
                    {isVat ? 'Ціна без ПДВ' : 'Ціна'}
                  </th>
                  <th className="border border-black p-1.5 text-right font-bold w-28">
                    {isVat ? 'Сума без ПДВ' : 'Сума'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {(realization.items || []).map((item: any, index: number) => {
                  const itemPrice = isVat ? Number(item.price || 0) / 1.2 : Number(item.price || 0);
                  const itemTotal = isVat ? Number(item.total || 0) / 1.2 : Number(item.total || 0);

                  return (
                    <tr key={index}>
                      <td className="border border-black p-1 text-center">
                        {index + 1}
                      </td>
                      <td className="border border-black p-1 text-left font-medium">
                        {item.productName || item.productId}
                      </td>
                      <td className="border border-black p-1 text-center">
                        {item.unit || "кг"}
                      </td>
                      <td className="border border-black p-1 text-right">
                        {Number(item.quantity).toFixed(3)}
                      </td>
                      <td className="border border-black p-1 text-right">
                        {itemPrice.toFixed(2)}
                      </td>
                      <td className="border border-black p-1 text-right">
                        {itemTotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}

                {/* Summary Rows */}
                {isVat ? (
                  <>
                    <tr>
                      <td colSpan={5} className="border border-black p-1 text-right font-bold">
                        Разом без ПДВ:
                      </td>
                      <td className="border border-black p-1 text-right font-bold">
                        {amountWithoutVat.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="border border-black p-1 text-right font-bold">
                        ПДВ:
                      </td>
                      <td className="border border-black p-1 text-right font-bold">
                        {vatAmount.toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="border border-black p-1 text-right font-bold">
                        Всього з ПДВ:
                      </td>
                      <td className="border border-black p-1 text-right font-bold">
                        {totalAmount.toFixed(2)}
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={5} className="border border-black p-1 text-right font-bold">
                      Всього:
                    </td>
                    <td className="border border-black p-1 text-right font-bold">
                      {totalAmount.toFixed(2)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Sum in Words Block */}
            <div className="mb-6 text-xs space-y-1">
              <div className="text-black">Всього на суму:</div>
              <div className="font-bold text-black text-sm">
                {numberToWordsUk(totalAmount)}
              </div>
              {isVat && (
                <div className="font-bold text-black text-xs">
                  ПДВ: {vatAmount.toFixed(2)} грн.
                </div>
              )}
            </div>

            {/* Location & Signatures Section */}
            <div className="mt-8 text-xs space-y-6">
              {isVat && (
                <div className="flex items-center gap-1">
                  <span className="font-semibold">Місце складання</span>
                  <span>{locationText}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-16 pt-2">
                {/* Supplier Signature */}
                <div>
                  <div className="font-bold mb-4">Від постачальника</div>
                  <div className="border-b border-black w-full mb-1"></div>
                  <div className="text-center font-medium text-xs">
                    директор {directorName.includes('директор') ? directorName.replace('директор', '').trim() : directorName}
                  </div>
                  <div className="text-[9px] text-gray-700 mt-2 italic">
                    * Відповідальний за здійснення господарської операції і правильність її оформлення
                  </div>
                </div>

                {/* Recipient Signature */}
                <div>
                  <div className="font-bold mb-4">Отримав(ла)</div>
                  <div className="border-b border-black w-full mb-1"></div>
                  <div className="flex justify-between text-[11px] text-gray-800 mt-1 font-medium">
                    <span>за дов.</span>
                    <span>№ ______</span>
                    <span>від __ . __ . ______</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      <style>
        {`
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 10mm;
                        }
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
                            width: 100% !important;
                            max-width: 100% !important;
                            padding: 0 !important;
                            margin: 0 !important;
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
