export interface Product {
    id: string;
    name: string;
    prices: Record<string, number>;
    unit: string;
    category: string;
    createdAt: number;
    updatedAt: number;
    photos?: string[];
    // localImagePath and imageLastUpdated are specific to React Native local caching, 
    // but might be useful if we implement service worker caching later. 
    // For now, we can omit them or keep them optional.
    localImagePath?: string | null;
    imageLastUpdated?: number | null;
    isDeleted?: boolean;
}
