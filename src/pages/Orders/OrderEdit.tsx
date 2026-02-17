import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrderService } from '../../services/order.service';
import type { Order } from '../../types/order';
import OrderForm from '../../components/OrderForm';

export default function OrderEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [order, setOrder] = useState<Order | null>(null);

    useEffect(() => {
        loadData();
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const orderData = await OrderService.getOrder(id);
            setOrder(orderData);
        } catch (error) {
            console.error(error);
            alert(t('common.error', 'Failed to load data'));
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (data: any) => {
        if (!id) return;
        setSaving(true);
        try {
            await OrderService.updateOrder(id, data);
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
        <OrderForm 
            initialData={order}
            onSubmit={handleSubmit}
            saving={saving}
            title={`${t('order.edit', 'Edit Order')} #${order.id.slice(0, 8)}`}
        />
    );
}
