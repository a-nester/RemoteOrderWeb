import type { PriceType } from "../types/priceType";
import { API_URL } from "../constants/api";
import axios from "axios";
import { useAuthStore } from "../store/auth.store";

const ADMIN_API_URL = `${API_URL}/admin`;

export const PriceTypesService = {
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
                id: item.id,
                name: item.name,
                slug: item.slug,
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
