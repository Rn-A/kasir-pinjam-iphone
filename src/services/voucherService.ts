import { Voucher } from '../types';

const API_URL = (import.meta as any).env.APP_URL || 'http://localhost:5000/api';

export const VoucherService = {
  async getAll(): Promise<Voucher[]> {
    const res = await fetch(`${API_URL}/vouchers`);
    if (!res.ok) throw new Error('Failed to fetch vouchers');
    return res.json();
  },

  async create(data: Omit<Voucher, 'id' | 'created_at'>): Promise<Voucher> {
    const res = await fetch(`${API_URL}/vouchers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create voucher');
    return res.json();
  },

  async update(id: string, data: Partial<Voucher>): Promise<Voucher> {
    const res = await fetch(`${API_URL}/vouchers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update voucher');
    return res.json();
  },

  async delete(id: string): Promise<void> {
    const res = await fetch(`${API_URL}/vouchers/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete voucher');
  },

  async validate(code: string): Promise<Voucher> {
    const res = await fetch(`${API_URL}/vouchers/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to validate voucher');
    }
    return res.json();
  }
};
