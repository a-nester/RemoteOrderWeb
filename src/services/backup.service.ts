import axios from 'axios';
import { API_URL } from '../constants/api';
import { useAuthStore } from '../store/auth.store';

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: string;
}

const BACKUP_API_URL = `${API_URL}/admin/backups`;

const getAuthHeader = () => {
  const token = useAuthStore.getState().token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const BackupService = {
  /**
   * Fetches the list of backup files from the server.
   */
  getBackups: async (): Promise<BackupFile[]> => {
    const response = await axios.get(BACKUP_API_URL, { headers: getAuthHeader() });
    if (Array.isArray(response.data?.data)) return response.data.data;
    if (Array.isArray(response.data)) return response.data;
    return [];
  },

  /**
   * Triggers creation of a new database backup.
   */
  createBackup: async (): Promise<BackupFile> => {
    const response = await axios.post(BACKUP_API_URL, {}, { headers: getAuthHeader() });
    return response.data?.data || response.data;
  },

  /**
   * Downloads a backup file.
   */
  downloadBackup: async (filename: string): Promise<void> => {
    const response = await axios.get(`${BACKUP_API_URL}/${filename}/download`, {
      headers: getAuthHeader(),
      responseType: 'blob'
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /**
   * Deletes a backup file.
   */
  deleteBackup: async (filename: string): Promise<void> => {
    await axios.delete(`${BACKUP_API_URL}/${filename}`, { headers: getAuthHeader() });
  }
};
