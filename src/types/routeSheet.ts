export interface RouteSheetRealizationItem {
    id: string;
    realizationId: string;
    productId: string;
    productName: string;
    unit: string;
    quantity: number;
    price: number;
    total: number;
    sortOrder?: number;
}

export interface RouteSheetItem {
    id?: string;
    routeSheetId?: string;
    realizationId: string;
    clientPayment: number;
    comment?: string;
    sortOrder?: number;

    // Populated from joined Realization & Counterparty
    realizationNumber?: string;
    realizationDate?: string;
    realizationAmount?: number;
    realizationCurrency?: string;
    realizationSalesType?: string;
    realizationStatus?: string;
    realizationComment?: string;
    realizationWarehouseId?: string;
    counterpartyId?: string;
    counterpartyName?: string;
    counterpartyAddress?: string;
    counterpartyPhone?: string;
    counterpartyGroupId?: string;
    counterpartyGroupName?: string;
    previousDebt?: number;
    realizationWeight?: number;
    realizationItems?: RouteSheetRealizationItem[];
}

export interface RouteSheet {
    id: string;
    number: string;
    date: string;
    status: string;
    driverName?: string;
    comment?: string;
    totalAmount: number;
    totalPayment: number;
    totalPreviousDebt?: number;
    totalWeight?: number;
    itemCount?: number;
    creatorEmail?: string;
    createdBy?: number;
    items?: RouteSheetItem[];
    createdAt?: string;
    updatedAt?: string;
}

export interface RouteSheetFormData {
    date: string;
    driverName?: string;
    comment?: string;
    status?: string;
    items: {
        realizationId: string;
        clientPayment: number;
        comment?: string;
        sortOrder?: number;
    }[];
}
