
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrderService } from '../../services/order.service';
import OrderForm from '../../components/OrderForm';

export default function OrderCreate() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (data: any) => {
        setSaving(true);
        try {
            await OrderService.createOrder(data);
            navigate('/orders');
        } catch (error) {
            console.error("Failed to save order", error);
            alert(t('common.error', 'Failed to save order'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <OrderForm 
            onSubmit={handleSubmit}
            saving={saving}
            title={t('order.create', 'New Order')}
        />
    );
}
