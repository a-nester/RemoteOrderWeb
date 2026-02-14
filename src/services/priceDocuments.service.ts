import axios from "axios";
import { API_URL } from "../constants/api";
import { useAuthStore } from "../store/auth.store";
import type { PriceDocument } from "../types/priceDocument";

const DOCS_API_URL = `${API_URL}/price-documents`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const PriceDocumentsService = {
    async fetchDocuments(): Promise<PriceDocument[]> {
        const response = await axios.get(DOCS_API_URL, { headers: getAuthHeader() });
        return response.data.map((d: any) => ({
            ...d,
            date: new Date(d.date).getTime(),
            createdAt: new Date(d.createdAt).getTime(),
            updatedAt: new Date(d.updatedAt).getTime(),
        }));
    },

    async fetchDocument(id: string): Promise<PriceDocument> {
        const response = await axios.get(`${DOCS_API_URL}/${id}`, { headers: getAuthHeader() });
        const data = response.data;
        return {
            ...data,
            date: new Date(data.date).getTime(),
            createdAt: new Date(data.createdAt).getTime(),
            updatedAt: new Date(data.updatedAt).getTime(),
        };
    },

    async createDocument(data: Partial<PriceDocument>): Promise<PriceDocument> {
        const response = await axios.post(DOCS_API_URL, {
            ...data,
            date: data.date ? new Date(data.date).toISOString() : new Date().toISOString()
        }, { headers: getAuthHeader() });
        return response.data;
    },

    async updateDocument(id: string, data: Partial<PriceDocument>): Promise<PriceDocument> {
        const response = await axios.put(`${DOCS_API_URL}/${id}`, {
            ...data,
            date: data.date ? new Date(data.date).toISOString() : undefined
        }, { headers: getAuthHeader() });
        return response.data;
    },

    async updateItems(id: string, items: { productId: string; price: number }[]): Promise<void> {
        await axios.put(`${DOCS_API_URL}/${id}/items`, { items }, { headers: getAuthHeader() });
    },

    async applyDocument(id: string): Promise<void> {
        await axios.post(`${DOCS_API_URL}/${id}/apply`, {}, { headers: getAuthHeader() });
    }
};
