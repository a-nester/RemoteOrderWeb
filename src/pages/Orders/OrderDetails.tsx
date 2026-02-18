import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderService } from '../../services/order.service';
import { ProductsService } from '../../services/products.service';
import { RealizationService } from '../../services/realization.service';
import type { Order } from '../../types/order';
import type { Product } from '../../types/product';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { numberToWordsUk } from '../../utils/numberToWords';

export default function OrderDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [order, setOrder] = useState<Order | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [orderData, productsData] = await Promise.all([
                OrderService.getOrder(id),
                ProductsService.fetchProducts().then(res => res.products)
            ]);
            setOrder(orderData);
            setProducts(productsData);
        } catch (error) {
            console.error(error);
            alert("Failed to load order details");
        } finally {
            setLoading(false);
        }
    };

    const getProductName = (productId: string) => {
        const p = products.find(p => p.id === productId);
        return p ? p.name : productId;
    };



    const [printType, setPrintType] = useState<'invoice' | 'order'>('invoice');
    const [creatingWaybill, setCreatingWaybill] = useState(false);

    const handleCreateWaybill = async () => {
        if (!order) return;
        // Simple confirm for now
        if (!window.confirm(t('common.confirmCreateWaybill', 'Create waybill from this order?'))) return;
        
        setCreatingWaybill(true);
        try {
            const realization = await RealizationService.createFromOrder(order.id);
            navigate(`/realizations`); 
        } catch (error) {
            console.error(error);
            alert(t('common.error', 'Failed to create waybill'));
        } finally {
            setCreatingWaybill(false);
        }
    };

    const handlePrint = (type: 'invoice' | 'order') => {
        setPrintType(type);
        setTimeout(() => {
            window.print();
        }, 100);
    };
    
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }) + ' р.';
    };

    if (loading) return <div className="p-8 text-center">{t('common.loading', 'Loading...')}</div>;
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg print:shadow-none print:w-full print:m-0 print:p-0">
            {/* Header / Actions - Hidden on Print */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft className="mr-2" size={20} />
                    {t('common.back', 'Back')}
                </button>
                <div className="flex gap-2">
                    <button 
                        onClick={handleCreateWaybill}
                        disabled={creatingWaybill}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <FileText className="mr-2" size={20} />
                        {creatingWaybill ? t('common.processing', 'Processing...') : t('action.createWaybill', 'Create Waybill')}
                    </button>
                    <button 
                        onClick={() => handlePrint('order')}
                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                        <Printer className="mr-2" size={20} />
                        {t('print.order', 'Order')}
                    </button>
                    <button 
                        onClick={() => handlePrint('invoice')}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        <Printer className="mr-2" size={20} />
                        {t('print.invoice', 'Invoice')}
                    </button>
                </div>
            </div>

            {/* View Mode (Screen) - Simplified for screen viewing */}
            <div className="print:hidden">
                 <div className="border-b pb-6 mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('print.invoice', 'INVOICE')}</h1>
                        <p className="text-gray-500">{t('print.orderNumber', 'Order #')}{order.id.slice(0, 8)}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-gray-600 dark:text-gray-300 font-medium">RemoteOrder Inc.</p>
                        <p className="text-sm text-gray-500">{t('common.date', 'Date')}: {new Date(order.date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="mb-8">
                    <h3 className="text-gray-500 uppercase text-xs font-semibold tracking-wider mb-2">{t('print.billTo', 'Bill To')}</h3>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{order.counterpartyName}</p>
                </div>

                <table className="min-w-full mb-8">
                     <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="py-2 text-left text-gray-600 dark:text-gray-400">{t('common.item', 'Item')}</th>
                            {/* <th className="py-2 text-center text-gray-600 dark:text-gray-400">{t('common.quantity', 'Qty')}</th> */}
                            <th className="py-2 text-right text-gray-600 dark:text-gray-400">{t('common.total', 'Total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                         {order.items?.map((item: any, i: number) => (
                            <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-2 dark:text-gray-300">
                                    {getProductName(item.productId || item.id || 'unknown')} 
                                    <span className="text-sm text-gray-500 ml-2">x {item.quantity || item.count}</span>
                                </td>
<td className="py-2 text-right dark:text-gray-300">{((Number(item.quantity || item.count || 0)) * (Number(item.price || 0))).toFixed(2)}</td>
                            </tr>
                         ))}
                    </tbody>
                </table>
                <div className="text-right font-bold text-xl dark:text-white">
                    {Number(order.amount || 0).toFixed(2)} {order.currency}
                </div>
            </div>

            {/* Print Mode (Specific Layout from Reference) */}
            <div id="invoice-print-area" className="hidden print:block text-black bg-white p-4" style={{ fontFamily: 'Arial, sans-serif' }}>
                
                {/* Header Section */}
                <div className="mb-6 text-sm">
                    <div className="flex mb-2">
                        <div className="w-40 font-bold underline text-left">{t('print.supplier', 'Supplier')}</div>
                        <div className="text-left">МілКрай</div>
                    </div>
                    <div className="flex mb-2">
                        <div className="w-40 font-bold underline text-left">{t('print.recipient', 'Recipient')}</div>
                        <div className="text-left">{order.counterpartyName}</div>
                    </div>
                    <div className="flex mb-2">
                        <div className="w-40 font-bold underline text-left">{t('print.saleCondition', 'Sale Condition')}</div>
                        <div className="text-left">{t('print.cash', 'Cash settlement')}</div>
                    </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                    <div className="text-xl font-bold">
                        {printType === 'invoice' ? t('print.invoiceNumber', 'Invoice #') : t('print.orderNumber', 'Order #')} 
                        {order.id.slice(0, 8)} {/* Using short ID for display */}
                    </div>
                    <div className="font-bold">
                        {t('print.from', 'from')} {formatDate(order.date)}
                    </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-black mb-6 text-sm">
                    <thead>
                        <tr>
                            <th className="border border-black p-1 text-center w-10">{t('print.itemNo', 'No')}</th>
                            <th className="border border-black p-1 text-left">{t('print.item', 'Item')}</th>
                            <th className="border border-black p-1 text-center w-16">{t('print.unit', 'Unit')}</th>
                            <th className="border border-black p-1 text-center w-20">{t('print.qty', 'Qty')}</th>
                            <th className="border border-black p-1 text-center w-24">{t('print.price', 'Price')}</th>
                            <th className="border border-black p-1 text-center w-24">{t('print.sum', 'Sum')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items && order.items.map((item: any, index: number) => (
                            <tr key={index}>
                                <td className="border border-black p-1 text-center">{index + 1}</td>
                                <td className="border border-black p-1 text-left">{getProductName(item.productId || item.id || 'unknown')}</td>
                                <td className="border border-black p-1 text-center">{item.unit || 'шт'}</td>
                                <td className="border border-black p-1 text-right">{item.quantity || item.count}</td>
                                <td className="border border-black p-1 text-right">{Number(item.price || 0).toFixed(2)}</td>
                                <td className="border border-black p-1 text-right">{((Number(item.quantity || item.count || 0)) * (Number(item.price || 0))).toFixed(2)}</td>
                            </tr>
                        ))}
                        {/* Total Row in Table */}
                        <tr>
                            <td colSpan={5} className="border border-black p-1 text-right font-bold">{t('print.total', 'Total')}:</td>
                            <td className="border border-black p-1 text-right font-bold">{Number(order.amount || 0).toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>

                {/* Footer Sum */}
                <div className="mb-8">
                    <div className="mb-1">
                        {t('print.totalSum', 'Total sum')}:
                    </div>
                    <div className="font-bold border-b border-black inline-block min-w-full pb-1">
                        {numberToWordsUk(order.amount)}
                    </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between mt-12">
                    <div className="flex items-end">
                        <span className="mr-2">{t('print.fromSupplier', 'From supplier')}</span>
                        <div className="border-b border-black w-48 h-4"></div>
                    </div>
                    <div className="flex items-end">
                        <span className="mr-2">{t('print.receivedBy', 'Received by')}</span>
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
                        #invoice-print-area, #invoice-print-area * {
                            visibility: visible;
                        }
                        #invoice-print-area {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            min-height: 100vh;
                            margin: 0;
                            padding: 20px;
                            background: white;
                            color: black;
                            z-index: 9999;
                            display: block !important;
                        }
                        .print\\:hidden {
                            display: none !important;
                        }
                        @page {
                            size: auto;
                            margin: 10mm;
                        }
                    }
                `}
            </style>
        </div>
    );
}

// Correction on Print Style strategy:
// "display: none" on siblings or parents is hard.
// Best approach: Add a class "printable-area" to the wrapper.
// Make @media print hide "body > *:not(.printable-area)"?
// For now, I'll rely on the user just printing the page and the browser handling `print:hidden` classes (Tailwind supports this: `hidden-print` usually or `print:hidden`).
// Tailwind details: `print:hidden` sets `display: none` in print media.
// NOTE: Sidebar and Topbar need to be hidden too. They are outside this component.
// I will add a global style chunk in this component to hide typical layout elements if possible, or assume `print:hidden` needs to be applied to layout components.
// For MVP, I'll just rely on `print:hidden` inside the component and maybe adding some global CSS to hide sidebar/header if I can target them.
// A simple brute force style tag for `.sidebar` or similar might work if I verify the class names.
// Checking Layout...
