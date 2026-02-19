
export type OrderStatus = 'NEW' | 'ACCEPTED' | 'COMPLETED';

export const OrderStatus = {
    NEW: 'NEW' as OrderStatus,
    ACCEPTED: 'ACCEPTED' as OrderStatus,
    COMPLETED: 'COMPLETED' as OrderStatus
};

export interface OrderItem {
    id: string;
    orderId?: string;
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    unit: string;
    total: number;
}

export interface Order {
    id: string;
    date: string; // ISO Date string
    counterpartyId: string;
    counterpartyName: string;
    amount: number;
    status: OrderStatus;
    currency: string;
    items: OrderItem[];
    docNumber?: string;
    isDeleted?: boolean;
    comment?: string;
    createdAt?: number | string;
    updatedAt?: number | string;
    clientId?: string;
    clientEmail?: string;
}

export interface OrderFilter {
    startDate?: string;
    endDate?: string;
    search?: string;
    includeDeleted?: boolean;
}
