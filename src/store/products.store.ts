import { create } from "zustand";
import type { Product } from "../types/product";
import { ProductsService } from "../services/products.service";

interface ProductsState {
    products: Product[];
    loading: boolean;
    error: string | null;
    loadProducts: () => Promise<void>;
    addProduct: (product: Omit<Product, "id" | "createdAt" | "updatedAt">, imageFile?: File) => Promise<void>;
    updateProduct: (product: Product, imageFile?: File) => Promise<void>;
    deleteProduct: (id: string) => Promise<void>;
}

export const useProductsStore = create<ProductsState>((set, get) => ({
    products: [],
    loading: false,
    error: null,

    loadProducts: async () => {
        set({ loading: true, error: null });
        try {
            const { products } = await ProductsService.fetchProducts();
            set({ products, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    },

    addProduct: async (product, imageFile) => {
        set({ loading: true, error: null });
        try {
            await ProductsService.createProduct(product, imageFile);
            await get().loadProducts();
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    updateProduct: async (product, imageFile) => {
        set({ loading: true, error: null });
        try {
            await ProductsService.updateProduct(product, imageFile);
            await get().loadProducts();
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    deleteProduct: async (id) => {
        set({ loading: true, error: null });
        try {
            await ProductsService.deleteProduct(id);
            set(state => ({
                products: state.products.filter(p => p.id !== id),
                loading: false
            }));
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    }
}));
