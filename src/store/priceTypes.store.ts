import { create } from "zustand";
import type { PriceType } from "../types/priceType";
import { PriceTypesService } from "../services/priceTypes.service";

interface PriceTypesState {
    priceTypes: PriceType[];
    loading: boolean;
    error: string | null;
    loadPriceTypes: () => Promise<void>;
}

export const usePriceTypesStore = create<PriceTypesState>((set) => ({
    priceTypes: [],
    loading: false,
    error: null,

    loadPriceTypes: async () => {
        set({ loading: true, error: null });
        try {
            const priceTypes = await PriceTypesService.fetchPriceTypes();
            set({ priceTypes, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
    }
}));
