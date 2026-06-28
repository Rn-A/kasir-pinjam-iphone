import { Item } from '../types';
import { api } from '../lib/api';

export const ItemService = {
  async getAll(): Promise<Item[]> {
    return api.get<Item[]>('/items');
  },

  async getById(id: string): Promise<Item | null> {
    try {
      return await api.get<Item>(`/items/${id}`);
    } catch {
      return null;
    }
  },

  async create(item: Omit<Item, 'id'>): Promise<Item> {
    return api.post<Item>('/items', item);
  },

  async update(id: string, item: Partial<Item>): Promise<Item> {
    return api.put<Item>(`/items/${id}`, item);
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/items/${id}`);
  }
};
