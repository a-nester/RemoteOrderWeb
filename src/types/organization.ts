
export interface Organization {
    id: string;
    name: string;
    fullDetails?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Warehouse {
    id: string;
    name: string;
    address?: string;
    organizationId?: string;
    createdAt?: string;
    updatedAt?: string;
    isDeleted?: boolean;
}
