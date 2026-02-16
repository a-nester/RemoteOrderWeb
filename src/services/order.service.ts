import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import type { Order, OrderFilter } from '../types/order';

const ORDERS_API_URL = `${API_URL}/admin/orders`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

const mapOrder = (apiOrder: any): Order => {
    return {
        id: apiOrder.id,
        date: new Date(apiOrder.createdAt).toLocaleDateString(),
        counterpartyId: apiOrder.counterpartyId || apiOrder.userId,
        counterpartyName: apiOrder.counterpartyName || 'Unknown Client',
        amount: Number(apiOrder.total || 0),
        status: apiOrder.status,
        currency: 'UAH',
        items: typeof apiOrder.items === 'string' ? JSON.parse(apiOrder.items) : (apiOrder.items || [])
    };
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

            return response.data.map(mapOrder);
        } catch (error) {
            console.error("Failed to fetch orders", error);
            throw error;
        }
    },

    createOrder: async (_data: Partial<Order>): Promise<Order> => {
        throw new Error("Not implemented");
    },

    updateOrder: async (_id: string, _data: Partial<Order>): Promise<Order> => {
        throw new Error("Not implemented");
    }
};
