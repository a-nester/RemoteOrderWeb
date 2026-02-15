import type { PriceType } from "../types/priceType";
import { API_URL } from "../constants/api";
import axios from "axios";
import { useAuthStore } from "../store/auth.store";

const ADMIN_API_URL = `${API_URL}/admin`;

export const PriceTypesService = {
    async create(data: { name: string, slug: string, currency: string }): Promise<PriceType> {
        const token = useAuthStore.getState().token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const response = await axios.post(`${ADMIN_API_URL}/price-types`, data, { headers });
            return response.data;
        } catch (error) {
            console.error("Error creating price type:", error);
            throw error;
        }
    },

    async update(id: string, data: { name: string, slug: string, currency: string }): Promise<PriceType> {
        const token = useAuthStore.getState().token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const response = await axios.put(`${ADMIN_API_URL}/price-types/${id}`, data, { headers });
            return response.data;
        } catch (error) {
            console.error("Error updating price type:", error);
            throw error;
        }
    },

    async fetchPriceTypes(): Promise<PriceType[]> {
        const token = useAuthStore.getState().token;
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        try {
            const response = await axios.get(`${ADMIN_API_URL}/price-types`, {
                headers
            });

            const data = response.data;
            if (!Array.isArray(data)) return [];

            return data.map((item: any) => ({
                id: String(item.id),
                name: item.name,
                slug: item.slug,
                currency: item.currency,
                createdAt: new Date(item.createdAt || Date.now()).getTime(),
                updatedAt: new Date(item.updatedAt || Date.now()).getTime(),
                isDeleted: !!item.deleted || !!item.isDeleted,
            }));
        } catch (error) {
            console.error("Error fetching price types:", error);
            throw error;
        }
    },
};
