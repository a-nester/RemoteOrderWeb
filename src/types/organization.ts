
export interface OrganizationRequisites {
    edrpou?: string;
    tin?: string;
    accountNumber?: string;
    bankName?: string;
    certificateNumber?: string;
    address?: string;
    placeOfIssue?: string;
    printedFields?: {
        edrpou?: boolean;
        tin?: boolean;
        accountNumber?: boolean;
        bankName?: boolean;
        certificateNumber?: boolean;
        address?: boolean;
        placeOfIssue?: boolean;
    };
}

export interface Organization {
    id: string;
    name: string;
    fullDetails?: string;
    salesTypes?: string[];
    categories?: string[];
    vatCostCoefficient?: number;
    requisites?: OrganizationRequisites;
    isDefault?: boolean;
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
