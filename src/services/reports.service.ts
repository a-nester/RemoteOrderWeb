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
  salesType?: string;
}

export interface SalesByClientDetail {
  productName: string;
  unit: string;
  quantity: string | number;
  amount: string | number;
  profit: string | number;
  averagePrice: string | number;
}

export interface SalesByProduct {
  productId: string;
  productName: string;
  productCategory: string;
  totalQuantity: string | number;
  totalAmount: string | number;
  totalPurchaseCost: string | number;
  totalProfit: string | number;
  salesType?: string;
}

export interface InventoryMovementDetail {
  id: string;
  type: "GOODS_RECEIPT" | "REALIZATION";
  docNumber: string;
  date: string;
  quantity: string | number;
}

export interface InventoryMovement {
  productId: string;
  productName: string;
  productCategory: string | null;
  warehouseName: string | null;
  startBalance: string | number;
  incoming: string | number;
  outgoing: string | number;
  endBalance: string | number;
  details: InventoryMovementDetail[];
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

  getSalesByClient: async (dateFrom?: string, dateTo?: string, counterparty?: string, groupBySalesType?: boolean, salesType?: string): Promise<SalesByClient[]> => {
      const response = await axios.get(`${API_URL}/reports/sales/by-client`, {
          params: { dateFrom, dateTo, counterparty, groupBySalesType, salesType },
          headers: getAuthHeader()
      });
      return response.data;
  },

  getSalesByClientDetails: async (clientId: string, dateFrom?: string, dateTo?: string, salesType?: string): Promise<SalesByClientDetail[]> => {
      const response = await axios.get(`${API_URL}/reports/sales/by-client/details`, {
          params: { clientId, dateFrom, dateTo, salesType },
          headers: getAuthHeader()
      });
      return response.data;
  },

  getSalesByProduct: async (dateFrom?: string, dateTo?: string, counterparty?: string, groupBySalesType?: boolean, salesType?: string): Promise<SalesByProduct[]> => {
      const response = await axios.get(`${API_URL}/reports/sales/by-product`, {
          params: { dateFrom, dateTo, counterparty, groupBySalesType, salesType },
          headers: getAuthHeader()
      });
      return response.data;
  },

  getInventoryMovement: async (dateFrom: string, dateTo: string, warehouseId: string, sortBy: string = 'category'): Promise<InventoryMovement[]> => {
      const response = await axios.get(`${API_URL}/reports/inventory-movement`, {
          params: { dateFrom, dateTo, warehouseId, sortBy },
          headers: getAuthHeader()
      });
      return response.data;
  }
};
