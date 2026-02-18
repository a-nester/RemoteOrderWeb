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
    status: 'SAVED' | 'POSTED';
    comment?: string;
    items?: GoodsReceiptItem[];
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}
