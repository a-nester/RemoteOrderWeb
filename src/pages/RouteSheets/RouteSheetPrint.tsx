import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Printer, ArrowLeft } from 'lucide-react';
import { RouteSheetService } from '../../services/routeSheet.service';
import { OrganizationService } from '../../services/organization.service';
import type { RouteSheet, RouteSheetItem } from '../../types/routeSheet';
import type { Organization } from '../../types/organization';
import RealizationInvoicePrint, { formatDateForPrint } from '../../components/RealizationInvoicePrint';
import { numberToWordsUk } from '../../utils/numberToWords';

export default function RouteSheetPrint() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [routeSheet, setRouteSheet] = useState<RouteSheet | null>(null);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const load = async () => {
            try {
                setLoading(true);
                const [rsData, orgData] = await Promise.all([
                    RouteSheetService.getById(id),
                    OrganizationService.getOrganization().catch(() => null)
                ]);
                setRouteSheet(rsData);
                setOrganization(orgData);
            } catch (err: any) {
                console.error('Failed to load route sheet for printing', err);
                setError(err.response?.data?.message || err.message || 'Не вдалося завантажити маршрутний лист');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    useEffect(() => {
        if (routeSheet) {
            document.title = `МЛ_${routeSheet.number}_${new Date().toISOString().split('T')[0]}`;
            const timer = setTimeout(() => {
                window.print();
            }, 700);
            return () => clearTimeout(timer);
        }
    }, [routeSheet]);

    // Group route sheet items by Counterparty Folder / Group
    const groupedItems = useMemo(() => {
        if (!routeSheet?.items) return [];

        const groupsMap: Record<string, RouteSheetItem[]> = {};
        routeSheet.items.forEach(item => {
            const groupName = item.counterpartyGroupName || 'Без групи';
            if (!groupsMap[groupName]) {
                groupsMap[groupName] = [];
            }
            groupsMap[groupName].push(item);
        });

        const sortedGroupNames = Object.keys(groupsMap).sort((a, b) => a.localeCompare(b));

        return sortedGroupNames.map(name => ({
            groupName: name,
            items: groupsMap[name].sort((a, b) => (a.counterpartyName || '').localeCompare(b.counterpartyName || ''))
        }));
    }, [routeSheet]);

    if (loading) {
        return (
            <div className="p-10 text-center text-gray-500 font-medium">
                Підготовка маршрутного листа та накладних до друку...
            </div>
        );
    }

    if (error || !routeSheet) {
        return (
            <div className="p-10 text-center text-red-500 font-medium">
                {error || 'Маршрутний лист не знайдено'}
                <div className="mt-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Повернутися назад
                    </button>
                </div>
            </div>
        );
    }

    let globalInvoiceIndex = 1;

    return (
        <div className="bg-white text-black min-h-screen">
            {/* Print toolbar (hidden during print) */}
            <div className="print:hidden sticky top-0 z-50 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center shadow-sm">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад
                </button>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                    Маршрутний лист № {routeSheet.number} (з накладними по 2 екземпляри)
                </div>
                <button
                    onClick={() => window.print()}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-sm"
                >
                    <Printer className="mr-2 h-4 w-4" />
                    Друкувати
                </button>
            </div>

            {/* Print Container */}
            <div className="p-4 sm:p-8 max-w-5xl mx-auto print:p-0 print:m-0 print:max-w-none">
                {/* ======================================================== */}
                {/* 1. Сам Маршрутний лист (Page 1) */}
                {/* ======================================================== */}
                <div className="print-page-break-after pb-6" style={{ fontFamily: "'Times New Roman', Times, serif, Arial" }}>
                    {/* Header */}
                    <div className="border-b-2 border-black pb-3 mb-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <div className="text-lg font-bold tracking-tight">
                                    {organization?.name || 'ПП «СМАКОСИР»'}
                                </div>
                                <div className="text-xs text-gray-700">
                                    {organization?.fullDetails || 'Рівненська обл., Дубенський р-н, с. Пасіки, вул. Берестецька, 2 б.'}
                                </div>
                            </div>
                            <div className="text-right text-xs">
                                <div>Дата друку: {new Date().toLocaleDateString('uk-UA')}</div>
                                {routeSheet.driverName && (
                                    <div className="font-bold text-sm mt-1">Водій/Експедитор: {routeSheet.driverName}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Document Title */}
                    <div className="text-center my-4">
                        <h1 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">
                            МАРШРУТНИЙ ЛИСТ № {routeSheet.number}
                        </h1>
                        <div className="text-base font-semibold text-gray-800 mt-1">
                            від {formatDateForPrint(routeSheet.date)}
                        </div>
                        {routeSheet.comment && (
                            <div className="text-xs text-gray-600 mt-1 italic">
                                Примітка: {routeSheet.comment}
                            </div>
                        )}
                    </div>

                    {/* Summary Info Cards */}
                    <div className="grid grid-cols-3 gap-2 border border-black bg-gray-50 p-2.5 mb-4 text-center text-xs sm:text-sm">
                        <div>
                            <span className="text-gray-600 block text-xs">Всього накладних</span>
                            <span className="font-bold text-base">{routeSheet.items?.length || 0} шт.</span>
                        </div>
                        <div>
                            <span className="text-gray-600 block text-xs">Сума накладних</span>
                            <span className="font-bold text-base text-gray-900">
                                {Number(routeSheet.totalAmount || 0).toFixed(2)} ₴
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-600 block text-xs">Оплата клієнтів (разом)</span>
                            <span className="font-bold text-base text-gray-900">
                                {Number(routeSheet.totalPayment || 0).toFixed(2)} ₴
                            </span>
                        </div>
                    </div>

                    {/* Route Sheet Table: Grouped by Client Folder / Group */}
                    <table className="w-full border-collapse border border-black text-xs sm:text-sm mb-4">
                        <thead>
                            <tr className="bg-gray-200 font-bold">
                                <th className="border border-black p-1 text-center w-8">№</th>
                                <th className="border border-black p-1 text-center w-28">Накладна</th>
                                <th className="border border-black p-1 text-left">Клієнт (Одержувач)</th>
                                <th className="border border-black p-1 text-left">Адреса / Телефон</th>
                                <th className="border border-black p-1 text-right w-24">Сума, грн</th>
                                <th className="border border-black p-1 text-right w-24 bg-yellow-50">Оплата клієнта</th>
                                <th className="border border-black p-1 text-center w-28">Підпис / Відмітка</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedItems.map((group) => {
                                const groupSum = group.items.reduce((s, it) => s + Number(it.realizationAmount || 0), 0);
                                const groupPay = group.items.reduce((s, it) => s + Number(it.clientPayment || 0), 0);

                                return (
                                    <React.Fragment key={group.groupName}>
                                        {/* Folder / Group Header Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td colSpan={7} className="border border-black px-2 py-1 text-xs uppercase bg-gray-100 text-gray-900">
                                                📁 Папка / Район: <span className="underline">{group.groupName}</span> ({group.items.length} накладних)
                                            </td>
                                        </tr>

                                        {/* Invoices inside folder */}
                                        {group.items.map((item) => (
                                            <tr key={item.realizationId} className="hover:bg-gray-50">
                                                <td className="border border-black p-1 text-center font-medium">
                                                    {globalInvoiceIndex++}
                                                </td>
                                                <td className="border border-black p-1 text-center whitespace-nowrap">
                                                    <span className="font-bold">№ {item.realizationNumber}</span>
                                                    <div className="text-[10px] text-gray-600">
                                                        {item.realizationDate ? new Date(item.realizationDate).toLocaleDateString('uk-UA') : ''}
                                                    </div>
                                                </td>
                                                <td className="border border-black p-1 text-left font-semibold">
                                                    {item.counterpartyName}
                                                </td>
                                                <td className="border border-black p-1 text-left text-xs">
                                                    {item.counterpartyAddress || '—'}
                                                    {item.counterpartyPhone && (
                                                        <div className="text-[10px] text-gray-600">{item.counterpartyPhone}</div>
                                                    )}
                                                </td>
                                                <td className="border border-black p-1 text-right font-medium whitespace-nowrap">
                                                    {Number(item.realizationAmount || 0).toFixed(2)}
                                                </td>
                                                <td className="border border-black p-1 text-right font-bold whitespace-nowrap bg-yellow-50/50">
                                                    {Number(item.clientPayment || 0).toFixed(2)}
                                                </td>
                                                <td className="border border-black p-1 text-center">
                                                    <div className="border-b border-dotted border-gray-400 h-5 mt-2"></div>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Subtotal row per folder */}
                                        <tr className="bg-gray-50 font-semibold text-xs italic">
                                            <td colSpan={4} className="border border-black p-1 text-right">
                                                Разом по папці «{group.groupName}»:
                                            </td>
                                            <td className="border border-black p-1 text-right font-bold">
                                                {groupSum.toFixed(2)}
                                            </td>
                                            <td className="border border-black p-1 text-right font-bold bg-yellow-50/50">
                                                {groupPay.toFixed(2)}
                                            </td>
                                            <td className="border border-black p-1"></td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}

                            {/* Grand Totals */}
                            <tr className="bg-gray-200 font-bold text-sm">
                                <td colSpan={4} className="border border-black p-1.5 text-right uppercase">
                                    ВСЬОГО ПО МАРШРУТУ:
                                </td>
                                <td className="border border-black p-1.5 text-right font-bold whitespace-nowrap">
                                    {Number(routeSheet.totalAmount || 0).toFixed(2)} ₴
                                </td>
                                <td className="border border-black p-1.5 text-right font-bold whitespace-nowrap bg-yellow-100">
                                    {Number(routeSheet.totalPayment || 0).toFixed(2)} ₴
                                </td>
                                <td className="border border-black p-1.5"></td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Total in words */}
                    <div className="mb-6 text-xs sm:text-sm space-y-1">
                        <div>
                            <span>Всього до сплати за маршрутом: </span>
                            <span className="font-bold">{numberToWordsUk(Number(routeSheet.totalPayment || 0))}</span>
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="grid grid-cols-2 gap-12 pt-4 text-xs sm:text-sm">
                        <div>
                            <div className="font-bold mb-6">Диспетчер / Здав:</div>
                            <div className="border-b border-black w-full mb-1"></div>
                            <div className="text-center text-xs text-gray-600">(підпис, ПІБ)</div>
                        </div>
                        <div>
                            <div className="font-bold mb-6">Водій-експедитор / Прийняв:</div>
                            <div className="border-b border-black w-full mb-1"></div>
                            <div className="text-center text-xs text-gray-600">(підпис, ПІБ)</div>
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* 2. По два екземпляра накладних кожного клієнта */}
                {/* ======================================================== */}
                {(routeSheet.items || []).map((item, idx) => {
                    const printData = {
                        id: item.realizationId,
                        number: item.realizationNumber || String(idx + 1),
                        date: item.realizationDate || routeSheet.date,
                        amount: Number(item.realizationAmount || 0),
                        currency: item.realizationCurrency || 'UAH',
                        salesType: item.realizationSalesType,
                        comment: item.realizationComment,
                        counterpartyName: item.counterpartyName,
                        items: (item.realizationItems || []).map(ri => ({
                            productName: ri.productName,
                            productId: ri.productId,
                            unit: ri.unit,
                            quantity: Number(ri.quantity || 0),
                            price: Number(ri.price || 0),
                            total: Number(ri.total || 0)
                        }))
                    };

                    return (
                        <React.Fragment key={item.realizationId}>
                            {/* Copy 1 */}
                            <div className="print-page-break-after py-4">
                                <RealizationInvoicePrint
                                    realization={printData}
                                    organization={organization}
                                    copyLabel="Екземпляр 1 (Покупець)"
                                />
                            </div>

                            {/* Copy 2 */}
                            <div className="print-page-break-after py-4">
                                <RealizationInvoicePrint
                                    realization={printData}
                                    organization={organization}
                                    copyLabel="Екземпляр 2 (Постачальник)"
                                />
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Custom print styling to guarantee clean page breaks */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 10mm 10mm 10mm 10mm;
                    }
                    .print-page-break-after {
                        page-break-after: always;
                        break-after: page;
                    }
                }
            `}</style>
        </div>
    );
}
