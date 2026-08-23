import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';

export interface UserSessionItem {
  id: string;
  userId: number;
  userEmail: string;
  userRole: string;
  ipAddress: string;
  userAgent: string;
  device: string;
  region: string;
  loginTime: string;
}

export interface UserSessionsResponse {
  sessions: UserSessionItem[];
  total: number;
  limit: number;
  offset: number;
}

const getAuthHeader = () => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const SessionService = {
  getSessions: async (params?: {
    search?: string;
    role?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
    offset?: number;
  }): Promise<UserSessionsResponse> => {
    const response = await axios.get(`${API_URL}/service/sessions`, {
      params,
      headers: getAuthHeader(),
    });
    return response.data;
  },
};
