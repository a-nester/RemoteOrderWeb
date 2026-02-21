import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';

export interface StockBalance {
  productId: string;
  productName: string;
  productCategory: string | null;
  warehouseName: string | null;
  balance: string;
}

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const ReportsService = {
  getStockBalances: async (date: string, warehouseId?: string): Promise<StockBalance[]> => {
    let url = `${API_URL}/reports/stock-balances?date=${encodeURIComponent(date)}`;
    if (warehouseId) {
      url += `&warehouseId=${encodeURIComponent(warehouseId)}`;
    }
    const response = await axios.get(url, { headers: getAuthHeader() });
    return response.data;
  },
};
