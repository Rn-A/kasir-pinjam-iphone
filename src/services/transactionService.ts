import { Transaction } from '../types';
import { api } from '../lib/api';

export const TransactionService = {
  async getAll(): Promise<Transaction[]> {
    return api.get<Transaction[]>('/transactions');
  },

  async create(transaction: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
    return api.post<Transaction>('/transactions', transaction);
  },

  async update(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    return api.put<Transaction>(`/transactions/${id}`, transaction);
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/transactions/${id}`);
  },
  
  async getById(id: string): Promise<Transaction | null> {
    try {
      return await api.get<Transaction>(`/transactions/${id}`);
    } catch {
      return null;
    }
  }
};

