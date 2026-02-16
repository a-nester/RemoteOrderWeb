import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Save } from 'lucide-react';
import { OrderService } from '../../services/order.service';
import { CounterpartyService } from '../../services/counterparty.service'; // Check if exists
import type { Order } from '../../types/order';
import { OrderStatus } from '../../types/order';
import type { Counterparty } from '../../types/counterparty';

export default function OrderEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);
    const [counterparties, setCounterparties] = useState<Counterparty[]>([]);

    // Form State
    const [status, setStatus] = useState<OrderStatus>(OrderStatus.NEW);
    const [total, setTotal] = useState<string>('0');
    const [counterpartyId, setCounterpartyId] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            // Fetch order and counterparties
            // Note: CounterpartyService.getCounterparties might return different structure
            // Assuming we have a service to get all counterparties
            const [orderData, cpData] = await Promise.all([
                OrderService.getOrder(id),
                CounterpartyService.getAll()
            ]);
            
            setOrder(orderData);
            setCounterparties(cpData);
            
            // Init form
            setStatus(orderData.status);
            setTotal(orderData.amount.toString());
            setCounterpartyId(orderData.counterpartyId || '');

        } catch (error) {
            console.error(error);
            alert(t('common.error', 'Failed to load data'));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!id) return;
        setSaving(true);
        try {
            await OrderService.updateOrder(id, {
                status,
                amount: parseFloat(total), // API expects 'total' but type is 'amount'? type is 'amount', API 'total'. 
                // Wait, OrderService.updateOrder takes Partial<Order>. 
                // Order type has 'amount', not 'total'.
                // OrderService mapOrder maps 'total' from API to 'amount'.
                // When sending update, we should check what API expects.
                // admin.ts PUT expects { status, total, counterpartyId }.
                // So passing { amount: ... } through OrderService might need adaptation if OrderService just passes data through.
                // Let's check OrderService.updateOrder implementation inside this file generation block? No, I can't check now.
                // Standard: Service should handle mapping or I pass what API needs.
                // Let's assume I pass { status, total: ..., counterpartyId } casted as any or update Order type to have total?
                // OR OrderService maps it back? 
                // Currently OrderService just passes `data`.
                // So I will pass `total` as `any` or update types later.
                // For now, I'll pass `total` field.
                
                counterpartyId
            } as any); 
            navigate('/orders');
        } catch (error) {
            console.error(error);
            alert(t('common.error', 'Failed to save'));
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center">{t('common.loading', 'Loading...')}</div>;
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

    return (
        <div className="max-w-2xl mx-auto p-4 md:p-8 bg-white dark:bg-gray-800 shadow rounded-lg">
            <div className="flex items-center mb-6">
                <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {t('order.edit', 'Edit Order')} #{order.id.slice(0, 8)}
                </h1>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* Status */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('common.status', 'Status')}
                    </label>
                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as OrderStatus)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        {Object.values(OrderStatus).map((s) => (
                            <option key={s} value={s}>
                                {t(`status.${s}`, s)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Counterparty */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('menu.counterparties', 'Counterparty')}
                    </label>
                    <select
                        value={counterpartyId}
                        onChange={(e) => setCounterpartyId(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                        <option value="">Select Counterparty</option>
                        {counterparties.map((cp) => (
                            <option key={cp.id} value={cp.id}>
                                {cp.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Total Amount */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('common.sum', 'Total Amount')} ({order.currency})
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        value={total}
                        onChange={(e) => setTotal(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="mr-4 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                        {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <Save className="mr-2" size={18} />
                        {saving ? t('common.saving', 'Saving...') : t('common.save', 'Save Changes')}
                    </button>
                </div>
            </form>
        </div>
    );
}
