import axios from "axios";
import { useAuthStore } from "../store/auth.store";
import { API_URL } from "../constants/api";

export interface CollectionItem {
  id: number;
  dayOfWeek: number;
  client_id: string;
  client_name: string;
  status: "planned" | "in_progress" | "done";
  order_count?: number;
  product_count?: number;
  userId?: string;
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

  async getSchedule(userId?: string): Promise<CollectionItem[]> {
    const params: any = {};
    if (userId) params.userId = userId;

    const response = await axios.get(
      `${API_URL}/collection-schedule`,
      {
        ...this.getHeaders(),
        params,
      }
    );
    return response.data;
  }

  async addScheduleItem(
    dayOfWeek: number,
    clientId: string,
    userId?: string,
  ): Promise<CollectionItem> {
    const response = await axios.post(
      `${API_URL}/collection-schedule`,
      { dayOfWeek, clientId, userId },
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

  async updateDay(id: number, dayOfWeek: number): Promise<CollectionItem> {
    const response = await axios.patch(
      `${API_URL}/collection-schedule/${id}/day`,
      { dayOfWeek },
      this.getHeaders(),
    );
    return response.data;
  }

  async deleteScheduleItem(id: number): Promise<void> {
    await axios.delete(`${API_URL}/collection-schedule/${id}`, this.getHeaders());
  }

  async getDaySummary(dayOfWeek: number, userId?: string): Promise<DaySummary> {
    const params: any = { dayOfWeek };
    if (userId) params.userId = userId;

    const response = await axios.get(
      `${API_URL}/collection-schedule/day-summary`,
      {
        ...this.getHeaders(),
        params,
      }
    );
    return response.data;
  }

  async getPickingList(dayOfWeek: number): Promise<PickingItem[]> {
    const response = await axios.get(
      `${API_URL}/picking-list?dayOfWeek=${dayOfWeek}`,
      this.getHeaders(),
    );
    return response.data;
  }
}

export const collectionService = new CollectionService();
