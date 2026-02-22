import axios from 'axios';
import { API_URL } from '../constants/api';
import type { User } from '../store/auth.store';

interface LoginResponse {
    success: boolean;
    token?: string;
    user?: User;
    error?: string;
}

export const getAuthHeader = () => {
    const { token } = localStorage.getItem('auth') 
        ? JSON.parse(localStorage.getItem('auth') as string).state 
        : { token: null };
    return token ? { Authorization: `Bearer ${token}` } : {};
};

export const AuthService = {
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response = await axios.post(`${API_URL}/auth/login`, { email, password });

            if (response.data.token) {
                return {
                    success: true,
                    token: response.data.token,
                    user: response.data.user
                };
            }
            return { success: false, error: 'No token received' };
        } catch (error: any) {
            console.error("Login error", error);
            return { success: false, error: error.response?.data?.error || error.message };
        }
    }
};
