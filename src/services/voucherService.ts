import { Voucher } from '../types';
import { api } from '../lib/api';

export const VoucherService = {
  async getAll(): Promise<Voucher[]> {
    return api.get<Voucher[]>('/vouchers');
  },

  async create(data: Omit<Voucher, 'id' | 'created_at'>): Promise<Voucher> {
    return api.post<Voucher>('/vouchers', data);
  },

  async update(id: string, data: Partial<Voucher>): Promise<Voucher> {
    return api.put<Voucher>(`/vouchers/${id}`, data);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/vouchers/${id}`);
  },

  async validate(code: string): Promise<Voucher> {
    return api.post<Voucher>('/vouchers/validate', { code });
  }
};
