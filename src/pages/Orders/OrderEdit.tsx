import { ErrorBoundary } from '../../components/ErrorBoundary';

// ... existing imports ...

export default function OrderEdit() {
    // ... existing hook logic ... 

    if (loading) return <div className="p-8 text-center">{t('common.loading', 'Loading...')}</div>;
    if (!order) return <div className="p-8 text-center text-red-500">Order not found</div>;

    return (
        <ErrorBoundary>
            <OrderForm 
                initialData={order}
                onSubmit={handleSubmit}
                saving={saving}
                title={`${t('order.edit', 'Edit Order')} #${order.id.slice(0, 8)}`}
            />
        </ErrorBoundary>
    );
}
