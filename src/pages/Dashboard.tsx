import { useState, useEffect } from 'react';
import { TransactionService } from '../services/transactionService';
import { ItemService } from '../services/itemService';
import { Transaction, Item } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, isToday } from 'date-fns';
import { Package, Users, TrendingUp, Clock, Plus } from 'lucide-react';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUnits: 0,
    availableUnits: 0,
    rentedUnits: 0,
    todayRevenue: 0,
    activeRentals: 0
  });

  const [activeTransactions, setActiveTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const [items, txs] = await Promise.all([
          ItemService.getAll(),
          TransactionService.getAll()
        ]);

        const totalUnits = items.length;
        const availableUnits = items.filter(i => i.status === 'available').length;
        const rentedUnits = items.filter(i => i.status === 'rented').length;

        const todayRevenue = txs
          .filter(tx => isToday(new Date(tx.created_at || '')))
          .reduce((sum, tx) => sum + tx.total_price, 0);

        setStats({
          totalUnits,
          availableUnits,
          rentedUnits,
          todayRevenue,
          activeRentals: txs.filter(t => t.status !== 'completed' && t.status !== 'late').length
        });
        
        setActiveTransactions(txs.filter(t => t.status !== 'completed' && t.status !== 'late'));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) return <div className="py-10 text-center">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 text-sm font-medium">Total Barang</h3>
            <div className="w-[36px] h-[36px] bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200">
              <Package className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-4">{stats.totalUnits}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 text-sm font-medium">Barang Tersedia</h3>
            <div className="w-[36px] h-[36px] bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 border border-emerald-100">
              <Package className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-4">{stats.availableUnits}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 text-sm font-medium">Sedang Disewa</h3>
            <div className="w-[36px] h-[36px] bg-orange-50 rounded-lg flex items-center justify-center text-orange-600 border border-orange-100">
              <Users className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-500 mt-4">{stats.activeRentals}</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between">
            <h3 className="text-slate-500 text-sm font-medium">Pendapatan Hari Ini</h3>
            <div className="w-[36px] h-[36px] bg-slate-50 rounded-lg flex items-center justify-center text-slate-500 border border-slate-200">
              <TrendingUp className="w-[18px] h-[18px]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-4">{formatCurrency(stats.todayRevenue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            <h2 className="text-lg font-bold text-slate-900">Tracking Sewa Aktif</h2>
          </div>
          <Link
            to="/transactions"
            className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg text-sm font-medium inline-flex items-center transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" /> Buat Sewa Baru
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Barang & S/N</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pelanggan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Masa Sewa</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Sisa Waktu</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {activeTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500 font-medium">Tidak ada barang yang sedang disewa.</td>
                </tr>
              ) : (
                activeTransactions.map((tx) => {
                  const endDate = new Date(new Date(tx.start_date).getTime() + tx.duration_hours * 60 * 60 * 1000);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900">
                          {tx.item?.category && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1.5 font-semibold">[{tx.item.category}]</span>}
                          {tx.item?.name}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">S/N: {tx.item?.serial_number || '-'}</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-500">
                        {tx.customer?.name}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <div className="text-sm text-slate-900">{format(new Date(tx.start_date), 'dd MMM yyyy HH:mm')}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{tx.duration_hours} jam</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <CountdownDisplay endDate={endDate} />
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          Disewa
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
