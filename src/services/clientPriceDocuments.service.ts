import axios from "axios";
import { API_URL } from "../constants/api";
import { useAuthStore } from "../store/auth.store";
import type { 
    ClientPriceDocument, 
    ClientPriceDocumentItem, 
    PrepareClientPriceItemsResponse,
    ActiveClientDiscount 
} from "../types/clientPriceDocument";

const CLIENT_DOCS_API_URL = `${API_URL}/client-price-documents`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const ClientPriceDocumentsService = {
    async fetchDocuments(filters?: { counterpartyId?: string; status?: string; search?: string }): Promise<ClientPriceDocument[]> {
        const response = await axios.get(CLIENT_DOCS_API_URL, {
            headers: getAuthHeader(),
            params: filters
        });
        return response.data;
    },

    async fetchDocument(id: string): Promise<ClientPriceDocument> {
        const response = await axios.get(`${CLIENT_DOCS_API_URL}/${id}`, { headers: getAuthHeader() });
        return response.data;
    },

    async prepareItems(counterpartyId: string): Promise<PrepareClientPriceItemsResponse> {
        const response = await axios.get(`${CLIENT_DOCS_API_URL}/prepare-items`, {
            headers: getAuthHeader(),
            params: { counterpartyId }
        });
        return response.data;
    },

    async createDocument(data: { counterpartyId: string; date?: string; comment?: string; items: ClientPriceDocumentItem[] }): Promise<ClientPriceDocument> {
        const response = await axios.post(CLIENT_DOCS_API_URL, data, { headers: getAuthHeader() });
        return response.data;
    },

    async updateDocument(id: string, data: { date?: string; comment?: string; items: ClientPriceDocumentItem[] }): Promise<ClientPriceDocument> {
        const response = await axios.put(`${CLIENT_DOCS_API_URL}/${id}`, data, { headers: getAuthHeader() });
        return response.data;
    },

    async applyDocument(id: string): Promise<ClientPriceDocument> {
        const response = await axios.post(`${CLIENT_DOCS_API_URL}/${id}/apply`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    async unpostDocument(id: string): Promise<ClientPriceDocument> {
        const response = await axios.post(`${CLIENT_DOCS_API_URL}/${id}/unpost`, {}, { headers: getAuthHeader() });
        return response.data;
    },

    async deleteDocument(id: string): Promise<void> {
        await axios.delete(`${CLIENT_DOCS_API_URL}/${id}`, { headers: getAuthHeader() });
    },

    async fetchActiveDiscounts(counterpartyId: string): Promise<ActiveClientDiscount[]> {
        const response = await axios.get(`${CLIENT_DOCS_API_URL}/discounts/${counterpartyId}`, { headers: getAuthHeader() });
        return response.data;
    }
};
