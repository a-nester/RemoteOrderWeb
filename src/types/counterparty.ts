export interface CounterpartyGroup {
    id: string;
    name: string;
    parentId?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Counterparty {
    id: string;
    name: string;
    address?: string;
    phone?: string;
    contactPerson?: string;
    isBuyer: boolean;
    isSeller: boolean;
    priceTypeId?: string;
    groupId?: string;
    warehouseId?: string;
    // Expanded fields
    groupName?: string;
    priceTypeName?: string;
    createdAt?: string;
    updatedAt?: string;
}
