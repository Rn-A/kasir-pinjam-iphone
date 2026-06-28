import { Customer } from '../types';
import { api } from '../lib/api';

export const CustomerService = {
  async getAll(): Promise<Customer[]> {
    return api.get<Customer[]>('/customers');
  },

  async create(customer: Omit<Customer, 'id'>): Promise<Customer> {
    return api.post<Customer>('/customers', customer);
  },

  async update(id: string, customer: Partial<Customer>): Promise<Customer> {
    return api.put<Customer>(`/customers/${id}`, customer);
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/customers/${id}`);
  }
};

