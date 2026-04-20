import axios from 'axios';
import { getAuthHeader } from '../services/auth.service';
import { API_URL } from '../constants/api';

export interface UserPermissions {
    priceEditor?: {
        priceSettings?: boolean;
        priceTypes?: boolean;
    };
    reports?: {
        stockBalances?: boolean;
        inventory?: boolean;
        sales?: boolean;
        reconciliation?: boolean;
        cashflow?: boolean;
    };
    finance?: {
        transactions?: boolean;
        cashboxes?: boolean;
    };
    documents?: {
        orders?: boolean;
        realizations?: boolean;
        goodsReceipts?: boolean;
        buyerReturns?: boolean;
        supplierReturns?: boolean;
    };
}

export interface User {
    id: string;
    email: string;
    role: 'admin' | 'manager' | 'client';
    warehouseId?: string | null;
    counterpartyId?: string | null;
    organizationId?: number | null;
    permissions?: UserPermissions;
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
