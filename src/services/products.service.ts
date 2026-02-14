import type { Product } from "../types/product";
import { API_URL } from "../constants/api";
import axios from "axios";

import { useAuthStore } from "../store/auth.store";

const PRODUCTS_API_URL = `${API_URL}/products`;
const ADMIN_PRODUCTS_URL = `${API_URL}/admin/products`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// ...

export const ProductsService = {
    /**
     * FETCH PRODUCTS
     */
    async fetchProducts(since?: number): Promise<{ products: Product[], timestamp: number }> {
        try {
            const url = since ? `${PRODUCTS_API_URL}?since=${since}` : PRODUCTS_API_URL;
            // Admin secret is no longer used, but if backend still requires it for legacy, we might have issues.
            // But I updated backend to accept Bearer token.
            const response = await axios.get(url, {
                headers: getAuthHeader()
            });

            const rawData = response.data;
            const items = Array.isArray(rawData) ? rawData : (rawData.items || []);
            const timestamp = typeof rawData === 'object' && rawData.timestamp ? rawData.timestamp : Date.now();

            console.log("Raw API response:", rawData); // Debug log

            const products = items.map((item: any) => {
                let standardPrice = 0;

                // Try to extract price from 'prices' object or JSON string
                if (item.prices) {
                    let pricesObj = item.prices;
                    if (typeof pricesObj === 'string') {
                        try {
                            pricesObj = JSON.parse(pricesObj);
                        } catch (e) {
                            console.warn("Failed to parse prices JSON:", item.prices);
                            pricesObj = {};
                        }
                    }

                    if (pricesObj && typeof pricesObj === 'object') {
                        standardPrice = Number(pricesObj.standard);
                    }
                }

                // Fallback to 'price' field
                if (isNaN(standardPrice) || standardPrice === 0) {
                    if (item.price) {
                        standardPrice = Number(item.price);
                    }
                }

                // Final safety check
                if (isNaN(standardPrice)) {
                    standardPrice = 0;
                }

                return {
                    id: item.id,
                    name: item.name,
                    prices: { standard: standardPrice },
                    unit: item.unit,
                    category: item.category,
                    photos: item.photos || [],
                    createdAt: new Date(item.createdAt).getTime(),
                    updatedAt: new Date(item.updatedAt).getTime(),
                    // Map 'deleted' from API to 'isDeleted'
                    isDeleted: item.deleted !== undefined ? item.deleted : (!!item.isDeleted),
                };
            });

            return { products, timestamp };
        } catch (error) {
            console.error("Error fetching products:", error);
            throw error;
        }
    },

    /**
     * CREATE PRODUCT
     */
    async createProduct(product: Omit<Product, "id" | "createdAt" | "updatedAt">, imageFile?: File): Promise<void> {
        const formData = new FormData();
        formData.append("name", product.name);
        formData.append("prices", JSON.stringify(product.prices));
        formData.append("unit", product.unit);
        formData.append("category", product.category);

        if (imageFile) {
            formData.append("photos", imageFile);
        }

        await axios.post(ADMIN_PRODUCTS_URL, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                ...getAuthHeader(),
            },
        });
    },

    /**
     * UPDATE PRODUCT
     */
    async updateProduct(product: Product, imageFile?: File): Promise<void> {
        const formData = new FormData();
        formData.append("name", product.name);
        formData.append("prices", JSON.stringify(product.prices));
        formData.append("unit", product.unit);
        formData.append("category", product.category);

        if (imageFile) {
            formData.append("photos", imageFile);
        }

        await axios.put(`${ADMIN_PRODUCTS_URL}/${product.id}`, formData, {
            headers: {
                ...getAuthHeader(),
            },
        });
    },

    /**
     * DELETE PRODUCT
     */
    async deleteProduct(id: string): Promise<void> {
        await axios.delete(`${ADMIN_PRODUCTS_URL}/${id}`, {
            headers: getAuthHeader(),
        });
    }
};
