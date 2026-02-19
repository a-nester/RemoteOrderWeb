
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Order } from '../../types/order';
import { OrderStatus } from '../../types/order';
import { Edit, Trash2, Eye } from 'lucide-react';

interface OrderListProps {
    orders: Order[];
    onEdit: (order: Order) => void;
    onDelete?: (order: Order) => void;
    onView?: (order: Order) => void;
}

const OrderList: React.FC<OrderListProps> = ({ orders, onEdit, onDelete, onView }) => {
    const { t } = useTranslation();

    const getStatusColor = (status: OrderStatus) => {
        switch (status) {
            case OrderStatus.NEW:
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case OrderStatus.ACCEPTED:
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case OrderStatus.COMPLETED:
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('common.date', 'Date')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('menu.counterparties', 'Counterparties')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('common.sum', 'Sum')}
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('common.status', 'Status')}
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {t('common.actions', 'Actions')}
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {orders.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                                {t('common.noData', 'No orders found')}
                            </td>
                        </tr>
                    ) : (
                        orders.map((order) => (
                            <tr 
                                key={order.id} 
                                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                                onClick={() => onView && onView(order)}
                            >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {new Date(order.date).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {order.counterpartyName}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                    {order.amount.toFixed(2)} {order.currency}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                        {t(`status.${order.status}`, order.status)}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-2">
                                        {onView && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onView(order); }}
                                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                                title={t('common.view', 'View')}
                                            >
                                                <Eye size={18} />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onEdit(order); }}
                                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                            title={t('common.edit', 'Edit')}
                                        >
                                            <Edit size={18} />
                                        </button>
                                        {onDelete && (
                                             <button
                                                onClick={(e) => { e.stopPropagation(); onDelete(order); }}
                                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                                title={t('common.delete', 'Delete')}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default OrderList;
