import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import type { Order, OrderFilter } from '../types/order';

const ORDERS_API_URL = `${API_URL}/admin/orders`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const OrderService = {
    getOrders: async (filter: OrderFilter): Promise<Order[]> => {
        try {
            const params: any = {};
            if (filter.startDate) params.startDate = filter.startDate;
            if (filter.endDate) params.endDate = filter.endDate;
            if (filter.search) params.search = filter.search;

            const response = await axios.get(ORDERS_API_URL, {
                params,
                headers: getAuthHeader()
            });

            return response.data.map((o: any) => {
                // Parse items if string
                let items = [];
                try {
                    items = typeof o.items === 'string' ? JSON.parse(o.items) : (o.items || []);
                } catch (e) {
                    console.warn("Failed to parse order items", o.items);
                }

                return {
                    id: o.id,
                    date: o.createdAt,
                    counterpartyId: o.userId || 'unknown',
                    counterpartyName: o.userId || 'Unknown', // TODO: Fetch real name
                    amount: Number(o.total || 0),
                    status: o.status,
                    currency: 'UAH',
                    items: items
                };
            });
        } catch (error) {
            console.error("Failed to fetch orders", error);
            throw error;
        }
    },

    createOrder: async (_data: Partial<Order>): Promise<Order> => {
        // Not implemented for Admin Web yet
        throw new Error("Not implemented");
    },

    updateOrder: async (_id: string, _data: Partial<Order>): Promise<Order> => {
        // Implement status update if needed
        // For now just return mock or throw
        throw new Error("Not implemented");
    }
};
