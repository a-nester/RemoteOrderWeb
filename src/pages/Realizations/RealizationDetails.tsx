
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Printer } from 'lucide-react';
import { RealizationService } from '../../services/realization.service';
import type { Realization } from '../../types/realization';
import { numberToWordsUk } from '../../utils/numberToWords';

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

    if (loading) return <div className="p-8 text-center">{t('common.loading', 'Loading...')}</div>;
    if (!realization) return <div className="p-8 text-center text-red-500">Realization not found</div>;

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-800 shadow-lg rounded-lg print:shadow-none print:w-full print:m-0 print:p-0">
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-8 print:hidden">
                <button onClick={() => navigate('/realizations')} className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
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

            {/* Content */}
            <div id="realization-print-area">
                <div className="border-b pb-6 mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t('menu.realizations', 'Waybill')}</h1>
                        <p className="text-gray-500">#{realization.number}</p>
                    </div>
                     <div className="text-right">
                        <p className="text-gray-600 dark:text-gray-300 font-medium">RemoteOrder Inc.</p>
                        <p className="text-sm text-gray-500">{t('common.date', 'Date')}: {new Date(realization.date).toLocaleDateString()}</p>
                    </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-8">
                     <div>
                        <h3 className="text-gray-500 uppercase text-xs font-semibold tracking-wider mb-2">{t('print.supplier', 'Supplier')}</h3>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">МілКрай</p>
                         <p className="text-sm text-gray-600 dark:text-gray-400">{realization.warehouseName}</p>
                    </div>
                    <div>
                        <h3 className="text-gray-500 uppercase text-xs font-semibold tracking-wider mb-2">{t('print.recipient', 'Recipient')}</h3>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">{realization.counterpartyName}</p>
                    </div>
                </div>

                <table className="min-w-full mb-8">
                     <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700">
                             <th className="py-2 text-left text-gray-600 dark:text-gray-400">#</th>
                            <th className="py-2 text-left text-gray-600 dark:text-gray-400">{t('common.item', 'Item')}</th>
                            <th className="py-2 text-right text-gray-600 dark:text-gray-400">{t('print.qty', 'Qty')}</th>
                            <th className="py-2 text-right text-gray-600 dark:text-gray-400">{t('print.price', 'Price')}</th>
                            <th className="py-2 text-right text-gray-600 dark:text-gray-400">{t('common.total', 'Total')}</th>
                        </tr>
                    </thead>
                    <tbody>
                         {realization.items?.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="py-2 text-gray-500">{i + 1}</td>
                                <td className="py-2 dark:text-gray-300">
                                    {item.productName || item.productId}
                                </td>
                                <td className="py-2 text-right dark:text-gray-300">{Number(item.quantity).toFixed(3)}</td>
                                <td className="py-2 text-right dark:text-gray-300">{Number(item.price).toFixed(2)}</td>
                                <td className="py-2 text-right dark:text-gray-300">{Number(item.total).toFixed(2)}</td>
                            </tr>
                         ))}
                    </tbody>
                </table>
                <div className="text-right font-bold text-xl dark:text-white mb-4">
                    {t('print.total', 'Total')}: {Number(realization.amount).toFixed(2)} {realization.currency}
                </div>
                 <div className="border-t pt-4 text-sm text-gray-500 dark:text-gray-400">
                    <p>{t('print.totalSum', 'Total sum')}: {numberToWordsUk(realization.amount)}</p>
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
