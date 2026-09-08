export interface ClientPriceDocumentItem {
    id?: string;
    documentId?: string;
    productId: string;
    productCode?: string;
    productName?: string;
    productUnit?: string;
    category?: string;
    costPrice: number;
    basePrice: number;
    discountPercent: number;
    finalPrice: number;
}

export interface ClientPriceDocument {
    id: string;
    number: string;
    date: string;
    counterpartyId: string;
    counterpartyName?: string;
    priceTypeId?: string;
    priceTypeName?: string;
    status: 'DRAFT' | 'APPLIED';
    comment?: string;
    roundingMethod?: 'UP' | 'DOWN';
    roundingValue?: number;
    createdBy?: number;
    createdByName?: string;
    postedBy?: number;
    postedByName?: string;
    postedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    items?: ClientPriceDocumentItem[];
}

export interface PrepareClientPriceItemsResponse {
    counterpartyId: string;
    counterpartyName: string;
    priceTypeId?: string;
    priceTypeName: string;
    items: ClientPriceDocumentItem[];
}

export interface ActiveClientDiscount {
    id: string;
    counterpartyId: string;
    productId: string;
    productCode: string;
    productName: string;
    discountPercent: number;
    documentId?: string;
}
