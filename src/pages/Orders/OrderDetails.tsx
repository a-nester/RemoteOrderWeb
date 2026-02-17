import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OrderService } from '../../services/order.service';
import { ProductsService } from '../../services/products.service';
import type { Order } from '../../types/order';
import type { Product } from '../../types/product';
import { ArrowLeft, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-8 text-center">{t('common.loading', 'Loading...')}</div>;
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

    return (
        <div id="invoice-print-area" className="max-w-4xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg print:shadow-none print:w-full print:absolute print:top-0 print:left-0">
            {/* Header / Actions - Hidden on Print */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft className="mr-2" size={20} />
                    {t('common.back', 'Back')}
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                    <Printer className="mr-2" size={20} />
                    {t('common.print', 'Print')}
                </button>
            </div>

            {/* Invoice Content */}
            <div className="print:p-0">
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
                            <th className="py-3 text-left text-sm font-semibold text-gray-600 dark:text-gray-400">{t('common.item', 'Item')}</th>
                            <th className="py-3 text-center text-sm font-semibold text-gray-600 dark:text-gray-400">{t('common.quantity', 'Qty')}</th>
                            <th className="py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">{t('common.price', 'Price')}</th>
                            <th className="py-3 text-right text-sm font-semibold text-gray-600 dark:text-gray-400">{t('common.total', 'Total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items && order.items.map((item: any, index: number) => (
                            <tr key={index} className="border-b border-gray-100 dark:border-gray-800">
                                <td className="py-4 text-sm text-gray-900 dark:text-white">{getProductName(item.productId || item.id || 'unknown')}</td>
                                <td className="py-4 text-center text-sm text-gray-600 dark:text-gray-300">{item.quantity || item.count}</td>
                                <td className="py-4 text-right text-sm text-gray-600 dark:text-gray-300">{item.price}</td>
                                <td className="py-4 text-right text-sm text-gray-900 dark:text-white font-medium">
                                    {((item.quantity || item.count || 0) * (item.price || 0)).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="text-right">
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{t('print.totalAmount', 'Total Amount')}</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                            {order.amount.toFixed(2)} {order.currency}
                        </p>
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
                            margin: 0;
                            padding: 20px;
                            background: white;
                            color: black;
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
