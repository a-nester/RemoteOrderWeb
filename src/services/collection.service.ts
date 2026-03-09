import axios from "axios";
import { useAuthStore } from "../store/auth.store";
import { API_URL } from "../constants/api";

export interface CollectionItem {
  id: number;
  date: string;
  client_id: string;
  client_name: string;
  status: "planned" | "in_progress" | "done";
  order_count?: number;
  product_count?: number;
}

export interface DaySummary {
  client_count: number;
  order_count: number;
  item_count: number;
}

export interface PickingItem {
  product_id: number;
  product_name: string;
  sku: string;
  total_quantity: number;
}

class CollectionService {
  private getHeaders() {
    const token = useAuthStore.getState().token;
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getSchedule(from: string, to: string): Promise<CollectionItem[]> {
    const response = await axios.get(
      `${API_URL}/collection-schedule?from=${from}&to=${to}`,
      this.getHeaders(),
    );
    return response.data;
  }

  async addScheduleItem(date: string, clientId: string): Promise<CollectionItem> {
    const response = await axios.post(
      `${API_URL}/collection-schedule`,
      { date, clientId },
      this.getHeaders(),
    );
    return response.data;
  }

  async updateStatus(
    id: number,
    status: "planned" | "in_progress" | "done",
  ): Promise<CollectionItem> {
    const response = await axios.patch(
      `${API_URL}/collection-schedule/${id}`,
      { status },
      this.getHeaders(),
    );
    return response.data;
  }

  async updateDate(id: number, date: string): Promise<CollectionItem> {
    const response = await axios.patch(
      `${API_URL}/collection-schedule/${id}/date`,
      { date },
      this.getHeaders(),
    );
    return response.data;
  }

  async deleteScheduleItem(id: number): Promise<void> {
    await axios.delete(`${API_URL}/collection-schedule/${id}`, this.getHeaders());
  }

  async getDaySummary(date: string): Promise<DaySummary> {
    const response = await axios.get(
      `${API_URL}/collection-schedule/day-summary?date=${date}`,
      this.getHeaders(),
    );
    return response.data;
  }

  async getPickingList(date: string): Promise<PickingItem[]> {
    const response = await axios.get(
      `${API_URL}/picking-list?date=${date}`,
      this.getHeaders(),
    );
    return response.data;
  }
}

export const collectionService = new CollectionService();
