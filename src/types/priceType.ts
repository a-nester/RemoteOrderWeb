export interface PriceType {
    id: string;
    name: string;
    slug: string; // e.g. "wholesale", "vip"
    currency?: string;
    createdAt: number;
    updatedAt?: number;
    isDeleted?: boolean;
}
