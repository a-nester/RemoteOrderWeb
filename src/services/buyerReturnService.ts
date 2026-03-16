import { api } from './api';

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
    getAll: async (filters?: { startDate?: string; endDate?: string }) => {
        const response = await api.get('/buyer-returns', { params: filters });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get(`/buyer-returns/${id}`);
        return response.data;
    },

    create: async (data: any) => {
        const response = await api.post('/buyer-returns', data);
        return response.data;
    },

    update: async (id: string, data: any) => {
        const response = await api.put(`/buyer-returns/${id}`, data);
        return response.data;
    },

    postDocument: async (id: string) => {
        const response = await api.post(`/buyer-returns/${id}/post`);
        return response.data;
    },

    unpostDocument: async (id: string) => {
        const response = await api.post(`/buyer-returns/${id}/unpost`);
        return response.data;
    }
};
