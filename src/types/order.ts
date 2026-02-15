
export type OrderStatus = 'NEW' | 'ACCEPTED' | 'COMPLETED';

export const OrderStatus = {
    NEW: 'NEW' as OrderStatus,
    ACCEPTED: 'ACCEPTED' as OrderStatus,
    COMPLETED: 'COMPLETED' as OrderStatus
};

export interface Order {
    id: string;
    date: string; // ISO Date string
    counterpartyId: string;
    counterpartyName: string;
    amount: number;
    status: OrderStatus;
    currency: string;
}

export interface OrderFilter {
    startDate: string;
    endDate: string;
    search?: string;
}
