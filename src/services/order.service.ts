
import type { Order, OrderFilter } from '../types/order';
import { OrderStatus } from '../types/order';

// Mock data
const MOCK_ORDERS: Order[] = [
    { id: '1', date: '2023-10-25T10:00:00Z', counterpartyId: '101', counterpartyName: 'Tech Solutions Inc.', amount: 1250.00, status: OrderStatus.NEW, currency: 'USD' },
    { id: '2', date: '2023-10-26T14:30:00Z', counterpartyId: '102', counterpartyName: 'Green Valley Grocers', amount: 450.50, status: OrderStatus.ACCEPTED, currency: 'USD' },
    { id: '3', date: '2023-10-27T09:15:00Z', counterpartyId: '103', counterpartyName: 'City Cafe', amount: 89.99, status: OrderStatus.COMPLETED, currency: 'USD' },
    { id: '4', date: '2023-11-01T11:00:00Z', counterpartyId: '101', counterpartyName: 'Tech Solutions Inc.', amount: 2500.00, status: OrderStatus.NEW, currency: 'USD' },
    { id: '5', date: '2023-11-02T16:45:00Z', counterpartyId: '104', counterpartyName: 'Mega Corp', amount: 5000.00, status: OrderStatus.NEW, currency: 'USD' },
];

export const OrderService = {
    getOrders: async (filter: OrderFilter): Promise<Order[]> => {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        let filtered = [...MOCK_ORDERS];

        if (filter.startDate) {
            filtered = filtered.filter(o => new Date(o.date) >= new Date(filter.startDate));
        }

        if (filter.endDate) {
            const end = new Date(filter.endDate);
            end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(o => new Date(o.date) <= end);
        }

        if (filter.search) {
            const searchLower = filter.search.toLowerCase();
            filtered = filtered.filter(o =>
                o.counterpartyName.toLowerCase().includes(searchLower) ||
                o.id.includes(searchLower)
            );
        }

        // Sort by date desc
        return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },

    createOrder: async (data: Partial<Order>): Promise<Order> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const newOrder: Order = {
            id: Math.random().toString(36).substr(2, 9),
            date: new Date().toISOString(),
            status: OrderStatus.NEW,
            counterpartyId: data.counterpartyId || '',
            counterpartyName: data.counterpartyName || 'Unknown',
            amount: data.amount || 0,
            currency: 'USD',
            ...data
        } as Order;
        MOCK_ORDERS.push(newOrder);
        return newOrder;
    },

    updateOrder: async (id: string, data: Partial<Order>): Promise<Order> => {
        await new Promise(resolve => setTimeout(resolve, 500));
        const index = MOCK_ORDERS.findIndex(o => o.id === id);
        if (index === -1) throw new Error("Order not found");

        MOCK_ORDERS[index] = { ...MOCK_ORDERS[index], ...data };
        return MOCK_ORDERS[index];
    }
};
