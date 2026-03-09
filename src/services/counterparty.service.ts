
import axios from 'axios';
import type { Counterparty, CounterpartyGroup } from '../types/counterparty';
import { useAuthStore } from '../store/auth.store';

import { API_URL } from '../constants/api';

// const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getHeaders = () => {
    // try to get from local storage directly as a fallback if zustand is slow to rehydrate
    const localAuth = localStorage.getItem('auth-storage');
    let token = useAuthStore.getState().token;
    
    if (!token && localAuth) {
        try {
            const parsed = JSON.parse(localAuth);
            token = parsed?.state?.token;
        } catch (e) {
            // ignore
        }
    }

    return {
        headers: {
            Authorization: `Bearer ${token}`
        }
    };
};

export const CounterpartyService = {
    // Groups
    getGroups: async (): Promise<CounterpartyGroup[]> => {
        const response = await axios.get(`${API_URL}/counterparty-groups`, getHeaders());
        return response.data;
    },
    createGroup: async (name: string, parentId?: string): Promise<CounterpartyGroup> => {
        const response = await axios.post(`${API_URL}/counterparty-groups`, { name, parentId }, getHeaders());
        return response.data;
    },

    // Counterparties
    getAll: async (): Promise<Counterparty[]> => {
        const response = await axios.get(`${API_URL}/counterparties`, getHeaders());
        return response.data;
    },

    create: async (data: Partial<Counterparty>): Promise<Counterparty> => {
        const response = await axios.post(`${API_URL}/counterparties`, data, getHeaders());
        return response.data;
    },

    update: async (id: string, data: Partial<Counterparty>): Promise<Counterparty> => {
        const response = await axios.put(`${API_URL}/counterparties/${id}`, data, getHeaders());
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await axios.delete(`${API_URL}/counterparties/${id}`, getHeaders());
    }
};
