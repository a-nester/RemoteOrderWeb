
export type RealizationStatus = 'DRAFT' | 'POSTED' | 'CANCELED';

export const RealizationStatus = {
    DRAFT: 'DRAFT' as RealizationStatus,
    POSTED: 'POSTED' as RealizationStatus,
    CANCELED: 'CANCELED' as RealizationStatus
};

export interface RealizationItem {
    id: string;
    realizationId?: string;
    productId: string;
    productName?: string; // Enriched
    quantity: number;
    price: number;
    total: number;
    createdAt?: string;
}

export interface Realization {
    id: string;
    date: string;
    number: string;
    counterpartyId: string;
    warehouseId: string;
    status: RealizationStatus;
    amount: number;
    currency: string;
    comment?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;

    // Enriched
    counterpartyName?: string;
    warehouseName?: string;
    items?: RealizationItem[];
    isDeleted?: boolean;
}
