import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';
import type { RouteSheet, RouteSheetFormData } from '../types/routeSheet';

const BASE_URL = `${API_URL}/route-sheets`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const RouteSheetService = {
    getAll: async (filter?: { startDate?: string; endDate?: string; status?: string; search?: string }): Promise<RouteSheet[]> => {
        const response = await axios.get(BASE_URL, {
            params: filter,
            headers: getAuthHeader()
        });
        return response.data;
    },

    getById: async (id: string): Promise<RouteSheet> => {
        const response = await axios.get(`${BASE_URL}/${id}`, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    create: async (data: RouteSheetFormData): Promise<RouteSheet> => {
        const response = await axios.post(BASE_URL, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    update: async (id: string, data: Partial<RouteSheetFormData>): Promise<RouteSheet> => {
        const response = await axios.put(`${BASE_URL}/${id}`, data, {
            headers: getAuthHeader()
        });
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await axios.delete(`${BASE_URL}/${id}`, {
            headers: getAuthHeader()
        });
    }
};
