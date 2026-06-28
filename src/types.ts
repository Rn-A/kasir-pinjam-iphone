export type ItemStatus = 'available' | 'rented' | 'maintenance';
export type TransactionStatus = 'active' | 'completed' | 'late';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  created_at?: string;
}

export interface Voucher {
  id: string;
  code: string;
  type: 'nominal' | 'percentage';
  value: number;
  is_active: boolean;
  expires_at?: string | null;
  created_at?: string;
}

export interface Item {
  id: string;
  name: string;
  serial_number: string;
  category: string;
  price_3h: number;
  price_6h: number;
  price_12h: number;
  price_24h: number;
  daily_price: number;
  color: string;
  status: ItemStatus;
  image_url: string;
  created_at?: string;
}

export interface Transaction {
  id: string;
  customer_id: string;
  item_id: string;
  start_date: string;
  duration_hours: number;
  total_price: number;
  discount_amount?: number;
  voucher_code?: string;
  status: TransactionStatus;
  actual_return_date?: string;
  created_at?: string;
  customer?: Customer;
  item?: Item;
}

export interface User {
  id: string;
  email: string;
}

export interface Category {
  id: string;
  name: string;
  created_at?: string;
}
