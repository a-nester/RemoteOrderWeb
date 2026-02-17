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
    const dateVal = apiOrder.createdAt || apiOrder.date || new Date().toISOString();
    let items = [];
    try {
        if (typeof apiOrder.items === 'string') {
            items = JSON.parse(apiOrder.items);
        } else if (Array.isArray(apiOrder.items)) {
            items = apiOrder.items;
        }
    } catch (e) {
        console.warn("Failed to parse items", e);
    }

    return {
        id: apiOrder.id,
        date: dateVal,
        counterpartyId: apiOrder.counterpartyId || apiOrder.userId,
        counterpartyName: apiOrder.counterpartyName || 'Unknown Client',
        amount: Number(apiOrder.total || 0),
        status: apiOrder.status,
        currency: 'UAH',
        items: items,
        isDeleted: apiOrder.isDeleted,
        comment: apiOrder.comment
    };
};

export const OrderService = {
    getOrders: async (filter: OrderFilter): Promise<Order[]> => {
        try {
            const params: any = {};
            if (filter.startDate) params.startDate = filter.startDate;
            if (filter.endDate) params.endDate = filter.endDate;
            if (filter.search) params.search = filter.search;
            if (filter.includeDeleted) params.includeDeleted = 'true';

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

    getOrder: async (id: string): Promise<Order> => {
        try {
            const response = await axios.get(`${ORDERS_API_URL}/${id}`, { headers: getAuthHeader() });
            return mapOrder(response.data);
        } catch (error) {
            console.error("Failed to get order", error);
            throw error;
        }
    },

    createOrder: async (data: Partial<Order>): Promise<Order> => {
        try {
            const response = await axios.post(ORDERS_API_URL, data, { headers: getAuthHeader() });
            return mapOrder(response.data);
        } catch (error) {
            console.error("Failed to create order", error);
            throw error;
        }
    },

    updateOrder: async (id: string, data: Partial<Order>): Promise<Order> => {
        try {
            const response = await axios.put(`${ORDERS_API_URL}/${id}`, data, { headers: getAuthHeader() });
            return mapOrder(response.data);
        } catch (error) {
            console.error("Failed to update order", error);
            throw error;
        }
    },

    deleteOrder: async (id: string): Promise<void> => {
        try {
            await axios.delete(`${ORDERS_API_URL}/${id}`, { headers: getAuthHeader() });
        } catch (error) {
            console.error("Failed to delete order", error);
            throw error;
        }
    },

    hardDeleteOrder: async (id: string): Promise<void> => {
        try {
            await axios.delete(`${ORDERS_API_URL}/${id}/hard`, { headers: getAuthHeader() });
        } catch (error) {
            console.error("Failed to hard delete order", error);
            throw error;
        }
    }
};
