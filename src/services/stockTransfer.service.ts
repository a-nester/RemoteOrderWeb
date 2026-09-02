import axios from 'axios';
import { useAuthStore } from '../store/auth.store';
import { API_URL } from '../constants/api';

export interface StockTransferItem {
  id?: string;
  productId: string;
  productName?: string;
  productCode?: string;
  unit?: string;
  quantity: number;
  availableQty?: number;
  price: number;
  total?: number;
}

export interface StockTransferDocument {
  id?: string;
  number?: string;
  date: string;
  fromWarehouseId: string;
  fromWarehouseName?: string;
  toWarehouseId: string;
  toWarehouseName?: string;
  status: 'DRAFT' | 'POSTED' | 'CANCELLED';
  comment?: string;
  totalAmount?: number;
  creatorName?: string;
  posterName?: string;
  items?: StockTransferItem[];
}

const getAuthHeader = () => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const StockTransferService = {
  getAll: async (filters?: { fromWarehouseId?: string; toWarehouseId?: string; status?: string; dateFrom?: string; dateTo?: string }): Promise<StockTransferDocument[]> => {
    const params = new URLSearchParams();
    if (filters?.fromWarehouseId) params.append('fromWarehouseId', filters.fromWarehouseId);
    if (filters?.toWarehouseId) params.append('toWarehouseId', filters.toWarehouseId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);

    const response = await axios.get(`${API_URL}/stock-transfers?${params.toString()}`, { headers: getAuthHeader() });
    return response.data;
  },

  getStockFill: async (warehouseId: string): Promise<StockTransferItem[]> => {
    const response = await axios.get(`${API_URL}/stock-transfers/stock-fill/${warehouseId}`, { headers: getAuthHeader() });
    return response.data;
  },

  getById: async (id: string): Promise<StockTransferDocument> => {
    const response = await axios.get(`${API_URL}/stock-transfers/${id}`, { headers: getAuthHeader() });
    return response.data;
  },

  create: async (data: Partial<StockTransferDocument>): Promise<StockTransferDocument> => {
    const response = await axios.post(`${API_URL}/stock-transfers`, data, { headers: getAuthHeader() });
    return response.data;
  },

  update: async (id: string, data: Partial<StockTransferDocument>): Promise<{ success: boolean; message: string }> => {
    const response = await axios.put(`${API_URL}/stock-transfers/${id}`, data, { headers: getAuthHeader() });
    return response.data;
  },

  postDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.post(`${API_URL}/stock-transfers/${id}/post`, {}, { headers: getAuthHeader() });
    return response.data;
  },

  deleteDocument: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await axios.delete(`${API_URL}/stock-transfers/${id}`, { headers: getAuthHeader() });
    return response.data;
  }
};
