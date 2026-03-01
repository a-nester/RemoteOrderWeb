import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import type { Realization } from '../types/realization';

const BASE_URL = `${API_URL}/realizations`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const RealizationService = {
    getAll: async (filter?: { includeDeleted?: boolean }): Promise<Realization[]> => {
        const params: any = {};
        if (filter?.includeDeleted) params.includeDeleted = 'true';
        
        const response = await axios.get(BASE_URL, { 
            params,
            headers: getAuthHeader() 
        });
        return response.data;
    },

    getById: async (id: string): Promise<Realization> => {
        const response = await axios.get(`${BASE_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    createFromOrder: async (orderId: string): Promise<Realization> => {
        const response = await axios.post(`${BASE_URL}/from-order/${orderId}`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    create: async (data: Partial<Realization>): Promise<{ id: string, message: string }> => {
        const response = await axios.post(BASE_URL, data, { headers: getAuthHeader() });
        return response.data;
    },

    update: async (id: string, data: Partial<Realization>): Promise<Realization> => {
        const response = await axios.put(`${BASE_URL}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    // Optional: post/conduct
    postRealization: async (id: string): Promise<{ success: boolean; profit: number }> => {
        const response = await axios.post(`${BASE_URL}/${id}/post`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    deleteRealization: async (id: string): Promise<void> => {
        await axios.delete(`${BASE_URL}/${id}`, { headers: getAuthHeader() });
    },

    unpostRealization: async (id: string): Promise<{ success: boolean }> => {
        const response = await axios.post(`${BASE_URL}/${id}/unpost`, {}, { headers: getAuthHeader() });
        return response.data;
    }
};



