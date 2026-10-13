import { useMemo } from 'react';
import type { Organization, OrganizationRequisites } from '../types/organization';
import { numberToWordsUk } from '../utils/numberToWords';

export interface RealizationPrintData {
    id?: string;
    number: string;
    date: string;
    amount: number;
    currency?: string;
    salesType?: string;
    comment?: string;
    counterpartyName?: string;
    organizationName?: string;
    organizationRequisites?: OrganizationRequisites;
    items?: Array<{
        productName?: string;
        productId?: string;
        unit?: string;
        quantity: number;
        price: number;
        total: number;
    }>;
}

interface RealizationInvoicePrintProps {
    realization: RealizationPrintData;
    organization: Organization | null;
    copyLabel?: string;
}

export const formatDateForPrint = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return (
        date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }) + ' р.'
    );
};

export default function RealizationInvoicePrint({
    realization,
    organization,
    copyLabel
}: RealizationInvoicePrintProps) {
    const requisitesData = realization.organizationRequisites || organization?.requisites;

    const activePrintedRequisites = useMemo(() => {
        if (!requisitesData) return [];
        const fields = requisitesData.printedFields || {};
        const list: Array<{ label: string; value: string }> = [];

        if (fields.edrpou && requisitesData.edrpou) {
            list.push({ label: 'ЄДРПОУ', value: requisitesData.edrpou });
        }
        if (fields.tin && requisitesData.tin) {
            list.push({ label: 'ІПН', value: requisitesData.tin });
        }
        if (fields.accountNumber && requisitesData.accountNumber) {
            list.push({ label: 'Р/р', value: requisitesData.accountNumber });
        }
        if (fields.bankName && requisitesData.bankName) {
            list.push({ label: 'Назва банку', value: requisitesData.bankName });
        }
        if (fields.certificateNumber && requisitesData.certificateNumber) {
            list.push({ label: '№ свідоцтва', value: requisitesData.certificateNumber });
        }
        if (fields.address && requisitesData.address) {
            list.push({ label: 'Адреса', value: requisitesData.address });
        }
        return list;
    }, [requisitesData]);

    const getSaleConditionLabel = (salesType?: string) => {
        const effectiveType = salesType?.trim() || organization?.salesTypes?.[0]?.trim();
        if (effectiveType === 'р/р ФОП' || effectiveType === 'з ПДВ' || effectiveType === 'Безготівковий') {
            return 'Безготівковий розрахунок';
        }
        return 'Готівковий розрахунок';
    };

    const isVat = realization.salesType === 'з ПДВ';
    const totalAmount = Number(realization.amount || 0);
    const amountWithoutVat = isVat ? totalAmount / 1.2 : totalAmount;
    const vatAmount = isVat ? totalAmount - amountWithoutVat : 0;

    const directorName = organization?.fullDetails?.trim() || '';
    const locationText = requisitesData?.placeOfIssue || requisitesData?.address || 'с. Пасіки';

    return (
        <div
            className="text-black bg-white p-6 w-full max-w-none print:p-0 print:m-0 print:w-full select-text"
            style={{ fontFamily: "'Times New Roman', Times, serif, Arial" }}
        >
            {copyLabel && (
                <div className="text-right text-xs font-semibold text-gray-500 mb-1 italic">
                    {copyLabel}
                </div>
            )}

            {/* Header Section */}
            <div className="mb-5 text-sm sm:text-base leading-relaxed space-y-1.5">
                {/* Supplier Row */}
                <div className="flex items-start">
                    <div className="w-36 font-bold underline text-left shrink-0">
                        Постачальник
                    </div>
                    <div className="text-left font-medium text-black">
                        <div className="font-bold">
                            {realization.organizationName || organization?.name || 'ПП «СМАКОСИР»'}
                        </div>
                        {activePrintedRequisites.length > 0 && (
                            <div className="mt-0.5 space-y-0.5 font-normal text-xs sm:text-[14px] text-gray-900">
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
                        {realization.counterpartyName || '—'}
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
            <div className="text-center my-5">
                <h2 className="text-xl sm:text-[22px] font-bold text-black tracking-tight">
                    Видаткова накладна № {realization.number}
                </h2>
                <div className="text-base sm:text-lg font-bold text-black mt-0.5">
                    від {formatDateForPrint(realization.date)}
                </div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border border-black mb-4 text-xs sm:text-sm">
                <thead>
                    <tr className="bg-gray-100 font-bold">
                        <th className="border border-black p-1 text-center w-8">№</th>
                        <th className="border border-black p-1 text-left">Товар</th>
                        <th className="border border-black p-1 text-center w-12">Од.</th>
                        <th className="border border-black p-1 text-right w-20">Кількість</th>
                        <th className="border border-black p-1 text-right w-24">
                            {isVat ? 'Ціна без ПДВ' : 'Ціна'}
                        </th>
                        <th className="border border-black p-1 text-right w-28">
                            {isVat ? 'Сума без ПДВ' : 'Сума'}
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {(realization.items || []).map((item, index) => {
                        const itemPrice = isVat ? Number(item.price || 0) / 1.2 : Number(item.price || 0);
                        const itemTotal = isVat ? Number(item.total || 0) / 1.2 : Number(item.total || 0);

                        return (
                            <tr key={index}>
                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                <td className="border border-black p-1 text-left font-medium">
                                    {item.productName || item.productId}
                                </td>
                                <td className="border border-black p-1 text-center">{item.unit || 'кг'}</td>
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
            <div className="mb-6 text-sm sm:text-base space-y-1">
                <div className="text-black">Всього на суму:</div>
                <div className="font-bold text-black text-base sm:text-lg">
                    {numberToWordsUk(totalAmount)}
                </div>
                {isVat && (
                    <div className="font-bold text-black text-sm sm:text-base">
                        ПДВ: {vatAmount.toFixed(2)} грн.
                    </div>
                )}
            </div>

            {/* Location & Signatures Section */}
            <div className="mt-6 text-sm sm:text-base space-y-5">
                {isVat && (
                    <div className="flex items-center gap-1">
                        <span className="font-semibold">Місце складання:</span>
                        <span>{locationText}</span>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-12 pt-2">
                    {/* Supplier Signature */}
                    <div>
                        <div className="font-bold mb-4">Від постачальника</div>
                        <div className="border-b border-black w-full mb-1"></div>
                        <div className="text-center font-medium text-sm sm:text-base min-h-[1.5rem]">
                            {directorName ? (directorName.toLowerCase().includes('директор') ? directorName : `директор ${directorName}`) : ''}
                        </div>
                        <div className="text-[12px] text-gray-700 mt-1 italic">
                            * Відповідальний за здійснення господарської операції і правильність її оформлення
                        </div>
                    </div>

                    {/* Recipient Signature */}
                    <div>
                        <div className="font-bold mb-4">Отримав(ла)</div>
                        <div className="border-b border-black w-full mb-1"></div>
                        <div className="flex justify-between text-xs sm:text-[14px] text-gray-800 mt-1 font-medium">
                            <span>за дов.</span>
                            <span>№ ______</span>
                            <span>від __ . __ . ______</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
