export interface GoodsReceiptItem {
    id: string;
    goodsReceiptId: string;
    productId: string;
    productName?: string; // For display
    quantity: number;
    price: number;
    total: number;
}

export interface GoodsReceipt {
    id: string;
    number: string;
    date: string;
    warehouseId: string;
    warehouseName?: string;
    providerId: string;
    providerName?: string;
    priceTypeId?: string;
    comment?: string;
    items?: GoodsReceiptItem[];
    amount?: string | number;
    status: 'SAVED' | 'POSTED';
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}
