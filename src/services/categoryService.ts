import { Category } from '../types';
import { api } from '../lib/api';

export const CategoryService = {
  async getAll(): Promise<Category[]> {
    return api.get<Category[]>('/categories');
  },

  async create(category: Omit<Category, 'id'>): Promise<Category> {
    return api.post<Category>('/categories', category);
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/categories/${id}`);
  }
};
