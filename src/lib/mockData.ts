import { v4 as uuidv4 } from 'uuid';
import { Customer, Item, Transaction } from '../types';

const getInitialData = () => {
  const isSetup = localStorage.getItem('isMockSetup_v2');
  
  if (!isSetup) {
    const customers: Customer[] = [
      { id: uuidv4(), name: 'Budi Santoso', phone: '08123456789', address: 'Jl. Sudirman No 1', created_at: new Date().toISOString() },
      { id: uuidv4(), name: 'Siti Aminah', phone: '08987654321', address: 'Jl. Thamrin No 2', created_at: new Date().toISOString() },
    ];

    const items: Item[] = [
      { id: uuidv4(), category: 'iPhone', name: 'iPhone 13 Pro', serial_number: '123456789012345', price_3h: 50000, price_6h: 80000, price_12h: 120000, price_24h: 150000, daily_price: 150000, color: 'Sierra Blue', status: 'available', image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80', created_at: new Date().toISOString() },
      { id: uuidv4(), category: 'iPhone', name: 'iPhone 14 Pro Max', serial_number: '987654321098765', price_3h: 80000, price_6h: 120000, price_12h: 180000, price_24h: 250000, daily_price: 250000, color: 'Deep Purple', status: 'available', image_url: 'https://images.unsplash.com/photo-1698243141673-c6c7475dbe99?w=800&q=80', created_at: new Date().toISOString() },
      { id: uuidv4(), category: 'Kamera', name: 'Sony Alpha 7 IV', serial_number: 'SN-78901234', price_3h: 90000, price_6h: 150000, price_12h: 220000, price_24h: 300000, daily_price: 300000, color: 'Black', status: 'rented', image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80', created_at: new Date().toISOString() },
    ];

    const transactions: Transaction[] = [
      {
        id: uuidv4(),
        customer_id: customers[0].id,
        item_id: items[2].id,
        start_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        duration_hours: 72,
        total_price: 900000,
        status: 'active',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];

    localStorage.setItem('mock_customers', JSON.stringify(customers));
    localStorage.setItem('mock_items', JSON.stringify(items));
    localStorage.setItem('mock_transactions', JSON.stringify(transactions));
    localStorage.setItem('isMockSetup_v2', 'true');
  }
};

getInitialData();

export const mockStorage = {
  getCustomers: (): Customer[] => JSON.parse(localStorage.getItem('mock_customers') || '[]'),
  setCustomers: (data: Customer[]) => localStorage.setItem('mock_customers', JSON.stringify(data)),
  
  getItems: (): Item[] => JSON.parse(localStorage.getItem('mock_items') || '[]'),
  setItems: (data: Item[]) => localStorage.setItem('mock_items', JSON.stringify(data)),
  
  getTransactions: (): Transaction[] => JSON.parse(localStorage.getItem('mock_transactions') || '[]'),
  setTransactions: (data: Transaction[]) => localStorage.setItem('mock_transactions', JSON.stringify(data)),
};
