import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import type { GoodsReceipt } from '../types/goodsReceipt';

const BASE_URL = `${API_URL}/goods-receipt`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const GoodsReceiptService = {
    getAll: async (filters?: { startDate?: string; endDate?: string }): Promise<GoodsReceipt[]> => {
        const response = await axios.get(BASE_URL, {
            headers: getAuthHeader(),
            params: filters
        });
        return response.data;
    },

    getById: async (id: string): Promise<GoodsReceipt> => {
        const response = await axios.get(`${BASE_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    create: async (data: Partial<GoodsReceipt>): Promise<GoodsReceipt> => {
        const response = await axios.post(BASE_URL, data, { headers: getAuthHeader() });
        return response.data;
    },

    update: async (id: string, data: Partial<GoodsReceipt>): Promise<GoodsReceipt> => {
        const response = await axios.put(`${BASE_URL}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    post: async (id: string): Promise<GoodsReceipt> => {
        const response = await axios.post(`${BASE_URL}/${id}/post`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    unpost: async (id: string): Promise<GoodsReceipt> => {
        const response = await axios.post(`${BASE_URL}/${id}/unpost`, {}, { headers: getAuthHeader() });
        return response.data;
    }
};
