import axios from 'axios';
import { getAuthHeader } from '../services/auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface User {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'client';
    warehouseId?: string | null;
}

export const UsersService = {
    getUsers: async (): Promise<User[]> => {
        const response = await axios.get(`${API_URL}/admin/users`, { headers: getAuthHeader() });
        return response.data;
    },

    updateUser: async (id: string, data: Partial<User> & { password?: string }): Promise<User> => {
        const response = await axios.put(`${API_URL}/admin/users/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    createUser: async (data: Omit<User, 'id'> & { password?: string }): Promise<User> => {
        const response = await axios.post(`${API_URL}/admin/users`, data, { headers: getAuthHeader() });
        return response.data;
    }
};
