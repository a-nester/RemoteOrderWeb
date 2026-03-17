import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = `${API_URL}/buyer-returns`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface BuyerReturnItem {
    id?: string;
    buyerReturnId?: string;
    productId: string;
    quantity: number;
    price: number;
    total: number;
    sortOrder?: number;
    productName?: string;
    sku?: string;
}

export interface BuyerReturn {
    id: string;
    number: string;
    date: string;
    counterpartyId: string;
    warehouseId: string;
    comment?: string;
    status: 'DRAFT' | 'POSTED';
    totalAmount: number;
    profit: number;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;

    // Joins
    counterpartyName?: string;
    warehouseName?: string;
    authorName?: string;
    items?: BuyerReturnItem[];
}

export const buyerReturnService = {
    getAll: async (filters?: { startDate?: string; endDate?: string }): Promise<BuyerReturn[]> => {
        const response = await axios.get(BASE_URL, { 
            params: filters,
            headers: getAuthHeader()
        });
        return response.data;
    },

    getById: async (id: string): Promise<BuyerReturn> => {
        const response = await axios.get(`${BASE_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    create: async (data: any): Promise<{ id: string, message: string }> => {
        const response = await axios.post(BASE_URL, data, { headers: getAuthHeader() });
        return response.data;
    },

    update: async (id: string, data: any): Promise<BuyerReturn> => {
        const response = await axios.put(`${BASE_URL}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    postDocument: async (id: string): Promise<{ success: boolean; profit: number }> => {
        const response = await axios.post(`${BASE_URL}/${id}/post`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    unpostDocument: async (id: string): Promise<{ success: boolean }> => {
        const response = await axios.post(`${BASE_URL}/${id}/unpost`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
        const response = await axios.delete(`${BASE_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    }
};
