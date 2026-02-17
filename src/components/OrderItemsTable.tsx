
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import type { OrderItem } from '../types/order';

interface OrderItemsTableProps {
    items: OrderItem[];
    currency: string;
    onUpdateItem: (id: string, updates: Partial<OrderItem>) => void;
    onRemoveItem: (id: string) => void;
    readonly?: boolean;
}

export default function OrderItemsTable({ items, currency, onUpdateItem, onRemoveItem, readonly = false }: OrderItemsTableProps) {
    const { t } = useTranslation();

    const handleQuantityChange = (id: string, value: string) => {
        const quantity = parseFloat(value);
        if (!isNaN(quantity) && quantity >= 0) {
            onUpdateItem(id, { quantity });
        }
    };

    const handlePriceChange = (id: string, value: string) => {
        const price = parseFloat(value);
        if (!isNaN(price) && price >= 0) {
            onUpdateItem(id, { price });
        }
    };

    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
                {t('order.noItems', 'No items added yet')}
            </div>
        );
    }

    return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10">#</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('common.product', 'Product')}</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 md:w-32">{t('common.quantity', 'Qty')}</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 md:w-32">{t('common.price', 'Price')}</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-24 md:w-32">{t('common.total', 'Total')}</th>
                        {!readonly && <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-16"></th>}
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    {items.map((item, index) => (
                        <tr key={item.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{index + 1}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">
                                {item.productName}
                                <div className="text-xs text-gray-400">{item.unit}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                                {readonly ? (
                                    <span>{item.quantity}</span>
                                ) : (
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                                        className="w-20 text-right rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    />
                                )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-500">
                                {readonly ? (
                                    <span>{item.price.toFixed(2)}</span>
                                ) : (
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={item.price}
                                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                        className="w-20 text-right rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                    />
                                )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-gray-900 dark:text-white">
                                {item.total.toFixed(2)}
                            </td>
                            {!readonly && (
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-medium">
                                    <button
                                        onClick={() => onRemoveItem(item.id)}
                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                        <td colSpan={4} className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                            {t('common.total', 'Total')}:
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                            {items.reduce((sum, i) => sum + i.total, 0).toFixed(2)} {currency}
                        </td>
                        {!readonly && <td></td>}
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
