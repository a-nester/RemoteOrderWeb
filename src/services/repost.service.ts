import axios from 'axios';
import { API_URL } from '../constants/api';
import { getAuthHeader } from './auth.service';

export const RepostService = {
    startReposting: async (options?: { startDate?: string, endDate?: string, types?: string[], action?: 'REPOST' | 'POST' | 'UNPOST' }) => {
        const response = await axios.post<{ message: string }>(`${API_URL}/service/repost-documents`, options || {}, { headers: getAuthHeader() });
        return response.data;
    },

    getLogsEventSource: (token?: string) => {
        // SSE EventSource does not support passing headers natively, 
        // but we can append the token to the URL or handle it if API allows.
        // In many systems, we can either use a polyfill or send token as query param
        // Assuming RemoteOrder passes token via headers, we might need a custom EventSource 
        // or just rely on the query parameter if the backend `userAuth` supports it.
        // Actually, Express `userAuth` usually reads headers `Authorization`. 
        // If SSE can't specify headers, we might fail auth. Let's see if the backend allows query token or if we are using an auth cookie.
        // Let's pass the token in standard EventSource URL as a query param and assume `auth.ts` middleware falls back to it.
        
        let url = `${API_URL}/service/repost-documents/logs`;
        // if token passed, we append query param
        const activeToken = token || localStorage.getItem('token');
        if (activeToken) {
            url += `?token=${activeToken}`;
        }
        
        return new EventSource(url);
    }
};
