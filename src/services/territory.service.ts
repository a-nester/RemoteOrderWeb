import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import type { Territory } from '../types/territory';

const getHeaders = () => {
    const token = useAuthStore.getState().token;
    return {
        headers: { Authorization: `Bearer ${token}` }
    };
};

export const TerritoryService = {
    getAll: async (): Promise<Territory[]> => {
        const response = await axios.get(`${API_URL}/territories`, getHeaders());
        return response.data;
    },

    create: async (name: string): Promise<Territory> => {
        const response = await axios.post(`${API_URL}/territories`, { name }, getHeaders());
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await axios.delete(`${API_URL}/territories/${id}`, getHeaders());
    }
};
