export type PriceDocumentStatus = 'DRAFT' | 'APPLIED';
export type InputMethod = 'MANUAL' | 'FORMULA';
export type RoundingMethod = 'NONE' | 'NEAREST_1' | 'NEAREST_5' | 'NEAREST_10' | 'UP_1' | 'UP_5' | 'UP_10';

export interface PriceDocumentItem {
    id: string;
    documentId: string;
    productId: string;
    productName?: string;
    unit?: string;
    price: number;
    oldPrice?: number;
    createdAt: number;
}

export interface PriceDocument {
    id: string;
    date: number; // timestamp
    status: PriceDocumentStatus;
    targetPriceTypeId: string;
    targetPriceTypeName?: string;
    inputMethod: InputMethod;
    sourcePriceTypeId?: string;
    sourcePriceTypeName?: string;
    markupPercentage?: number;
    roundingMethod?: RoundingMethod;
    roundingValue?: number;
    comment?: string;
    createdAt: number;
    updatedAt: number;
    items?: PriceDocumentItem[];
}
