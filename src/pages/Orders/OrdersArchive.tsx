
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import type { Order, OrderFilter } from '../../types/order';
import { OrderService } from '../../services/order.service';
import OrderList from './OrderList';
import { useAuthStore } from '../../store/auth.store';

export default function OrdersArchive() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useAuthStore((state) => state.user);
    
    // Filters
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(1); 
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        const date = new Date();
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
    });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadOrders();
    }, [startDate, endDate, searchTerm]);

    const loadOrders = async () => {
        setLoading(true);
        try {
            const filter: OrderFilter = {
                startDate,
                endDate,
                search: searchTerm,
                includeDeleted: true
            };
            const data = await OrderService.getOrders(filter);
            // Client-side filter to show ONLY deleted orders
            const archivedValues = data.filter(o => o.isDeleted);
            setOrders(archivedValues);
        } catch (error) {
            console.error("Failed to load archived orders", error);
        } finally {
            setLoading(false);
        }
    };

    const handleHardDeleteOrder = async (order: Order) => {
        if (user?.role !== 'admin') {
            alert(t('common.error', 'Only admins can perform this action'));
            return;
        }

        if (window.confirm(t('order.hardDeleteConfirmation', 'Are you sure you want to permanently delete this order? This cannot be undone.'))) {
            try {
                await OrderService.hardDeleteOrder(order.id);
                loadOrders();
            } catch (error) {
                console.error(error);
                alert(t('common.error', 'An error occurred'));
            }
        }
    };

    const handleViewOrder = (order: Order) => {
        navigate(`/orders/${order.id}`);
    };

    return (
        <div className="space-y-6">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 shadow rounded-lg sticky top-0 z-10 dark:bg-gray-800 gap-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('menu.archive', 'Archive')}</h1>
                
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    {/* Date Filters */}
                    <div className="flex gap-2 items-center">
                        <input 
                            type="date" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                        />
                        <span className="text-gray-500">-</span>
                        <input 
                            type="date" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                        />
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search size={18} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder={t('common.search', 'Search...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm"
                        />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10">{t('common.loading', 'Loading...')}</div>
            ) : (
                <OrderList 
                    orders={orders} 
                    onEdit={undefined as any} // Hide edit button
                    onDelete={user?.role === 'admin' ? handleHardDeleteOrder : undefined}
                    onView={handleViewOrder}
                />
            )}
        </div>
    );
}
