import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';

const BASE_URL = `${API_URL}/finance`;

const getAuthHeader = () => {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
};

// Types
export interface Cashbox {
  id: string;
  name: string;
  type: 'CASH' | 'BANK_ACCOUNT' | 'MANAGER';
  currency: string;
  organizationId: string | null;
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: 'INCOME' | 'OUTCOME' | 'BOTH';
}

export interface CashTransaction {
  id: string;
  date: string;
  number: string;
  type: 'INCOME' | 'OUTCOME';
  cashboxId: string;
  cashboxName?: string;
  amount: number;
  categoryId: string | null;
  categoryName?: string;
  counterpartyId: string | null;
  counterpartyName?: string;
  comment: string;
  createdBy: number | null;
  isDeleted: boolean;
}

export const FinanceService = {
  // Cashboxes
  getCashboxes: async (): Promise<Cashbox[]> => {
    const response = await axios.get(`${BASE_URL}/cashboxes`, { headers: getAuthHeader() });
    return response.data;
  },
  createCashbox: async (data: Partial<Cashbox>): Promise<Cashbox> => {
    const response = await axios.post(`${BASE_URL}/cashboxes`, data, { headers: getAuthHeader() });
    return response.data;
  },
  updateCashbox: async (id: string, data: Partial<Cashbox>): Promise<Cashbox> => {
    const response = await axios.put(`${BASE_URL}/cashboxes/${id}`, data, { headers: getAuthHeader() });
    return response.data;
  },

  // Categories
  getCategories: async (): Promise<TransactionCategory[]> => {
    const response = await axios.get(`${BASE_URL}/categories`, { headers: getAuthHeader() });
    return response.data;
  },
  createCategory: async (data: Partial<TransactionCategory>): Promise<TransactionCategory> => {
    const response = await axios.post(`${BASE_URL}/categories`, data, { headers: getAuthHeader() });
    return response.data;
  },
  updateCategory: async (id: string, data: Partial<TransactionCategory>): Promise<TransactionCategory> => {
    const response = await axios.put(`${BASE_URL}/categories/${id}`, data, { headers: getAuthHeader() });
    return response.data;
  },

  // Transactions
  getTransactions: async (): Promise<CashTransaction[]> => {
    const response = await axios.get(`${BASE_URL}/transactions`, { headers: getAuthHeader() });
    return response.data;
  },
  createTransaction: async (data: Partial<CashTransaction>): Promise<CashTransaction> => {
    const response = await axios.post(`${BASE_URL}/transactions`, data, { headers: getAuthHeader() });
    return response.data;
  },
  updateTransaction: async (id: string, data: Partial<CashTransaction>): Promise<CashTransaction> => {
    const response = await axios.put(`${BASE_URL}/transactions/${id}`, data, { headers: getAuthHeader() });
    return response.data;
  },
  deleteTransaction: async (id: string): Promise<void> => {
    await axios.delete(`${BASE_URL}/transactions/${id}`, { headers: getAuthHeader() });
  }
};
