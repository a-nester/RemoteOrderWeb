import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';

export interface StockBalance {
  productId: string;
  productName: string;
  productCategory: string | null;
  warehouseName: string | null;
  balance: string;
  totalValue: string;
}

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export interface SalesByClient {
  clientId: string;
  clientName: string;
  documentsCount: string | number;
  totalAmount: string | number;
  totalProfit: string | number;
}

export interface SalesByProduct {
  productId: string;
  productName: string;
  productCategory: string;
  totalQuantity: string | number;
  totalAmount: string | number;
  totalProfit: string | number;
}

export const ReportsService = {
  getStockBalances: async (date: string, warehouseId?: string, sortBy: string = 'category'): Promise<StockBalance[]> => {
    let url = `${API_URL}/reports/stock-balances?date=${encodeURIComponent(date)}&sortBy=${encodeURIComponent(sortBy)}`;
    if (warehouseId) {
      url += `&warehouseId=${encodeURIComponent(warehouseId)}`;
    }
    const response = await axios.get(url, { headers: getAuthHeader() });
    return response.data;
  },

  getSalesByClient: async (dateFrom?: string, dateTo?: string, counterparty?: string): Promise<SalesByClient[]> => {
      const response = await axios.get(`${API_URL}/reports/sales/by-client`, {
          params: { dateFrom, dateTo, counterparty },
          headers: getAuthHeader()
      });
      return response.data;
  },

  getSalesByProduct: async (dateFrom?: string, dateTo?: string, counterparty?: string): Promise<SalesByProduct[]> => {
      const response = await axios.get(`${API_URL}/reports/sales/by-product`, {
          params: { dateFrom, dateTo, counterparty },
          headers: getAuthHeader()
      });
      return response.data;
  }
};
