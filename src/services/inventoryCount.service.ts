import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { API_URL } from '../constants/api';

export interface InventoryCountItem {
  id?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  unit?: string;
  accountingQty: number;
  actualQty: number;
  differenceQty?: number;
  price: number;
  accountingTotal?: number;
  actualTotal?: number;
  differenceTotal?: number;
}

export interface InventoryCountDocument {
  id?: string;
  number?: string;
  date: string;
  warehouseId: string;
  warehouseName?: string;
  status: 'DRAFT' | 'SAVED' | 'POSTED' | 'CANCELLED';
  comment?: string;
  totalAccountingAmount?: number;
  totalActualAmount?: number;
  totalSurplusAmount?: number;
  totalShortageAmount?: number;
  creatorName?: string;
  posterName?: string;
  items?: InventoryCountItem[];
}

const getAuthHeader = () => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const InventoryCountService = {
  getAll: async (filters?: { warehouseId?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<InventoryCountDocument[]> => {
    const params = new URLSearchParams();
    if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const response = await axios.get(`${API_URL}/inventory-count?${params.toString()}`, { headers: getAuthHeader() });
    return response.data;
  },

  getStockFill: async (warehouseId: string): Promise<InventoryCountItem[]> => {
    const response = await axios.get(`${API_URL}/inventory-count/stock-fill/${warehouseId}`, { headers: getAuthHeader() });
    return response.data;
  },

  getById: async (id: string): Promise<InventoryCountDocument> => {
    const response = await axios.get(`${API_URL}/inventory-count/${id}`, { headers: getAuthHeader() });
    return response.data;
  },

  create: async (data: Partial<InventoryCountDocument>): Promise<InventoryCountDocument> => {
    const response = await axios.post(`${API_URL}/inventory-count`, data, { headers: getAuthHeader() });
    return response.data;
  },

  update: async (id: string, data: Partial<InventoryCountDocument>): Promise<{ success: boolean; message: string }> => {
    const response = await axios.put(`${API_URL}/inventory-count/${id}`, data, { headers: getAuthHeader() });
    return response.data;
  },

  postDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${API_URL}/inventory-count/${id}/post`, {}, { headers: getAuthHeader() });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`${API_URL}/inventory-count/${id}`, { headers: getAuthHeader() });
    return response.data;
  }
};
