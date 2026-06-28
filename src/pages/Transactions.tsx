import React, { useState, useEffect } from 'react';
import { TransactionService } from '../services/transactionService';
import { CustomerService } from '../services/customerService';
import { ItemService } from '../services/itemService';
import { VoucherService } from '../services/voucherService';
import { Transaction, Customer, Item, Voucher } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { addDays, format, isAfter, differenceInDays, differenceInHours, differenceInMinutes, isToday, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { Plus, CheckCircle, AlertTriangle, Printer, Search } from 'lucide-react';
import { CountdownDisplay } from '../components/CountdownDisplay';
import { LateTimerDisplay } from '../components/LateTimerDisplay';

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewTx, setPreviewTx] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    customer_id: '',
    item_id: '',
    start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    duration_hours: 24,
    voucher_code: ''
  });
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string>('');
  
  const [activeReturnTx, setActiveReturnTx] = useState<Transaction | null>(null);
  const [returnTimeMode, setReturnTimeMode] = useState<'now' | 'custom'>('now');
  const [customReturnTime, setCustomReturnTime] = useState('');

  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [custSaveError, setCustSaveError] = useState('');

  const handleSaveCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim() || !newCustAddress.trim()) return;
    try {
      setCustSaveError('');
      const created = await CustomerService.create({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        address: newCustAddress.trim()
      });
      const updatedCustomers = await CustomerService.getAll();
      setCustomers(updatedCustomers);
      setFormData(prev => ({
        ...prev,
        customer_id: created.id
      }));
      setIsAddingCustomer(false);
    } catch (err: any) {
      console.error(err);
      setCustSaveError(err.message || 'Gagal menyimpan pelanggan.');
    }
  };

  const durationOptions = [
    { label: '3 Jam', value: 3 },
    { label: '6 Jam', value: 6 },
    { label: '12 Jam', value: 12 },
    { label: '24 Jam (1 Hari)', value: 24 },
    { label: '2 Hari', value: 48 },
    { label: '3 Hari', value: 72 },
    { label: '4 Hari', value: 96 },
    { label: '5 Hari', value: 120 },
    { label: '6 Hari', value: 144 },
    { label: '7 Hari', value: 168 },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txs, custs, iphs] = await Promise.all([
        TransactionService.getAll(),
        CustomerService.getAll(),
        ItemService.getAll()
      ]);
      setTransactions(txs);
      setCustomers(custs);
      setItems(iphs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateVoucher = async () => {
    if (!formData.voucher_code) return;
    try {
      setVoucherError('');
      const v = await VoucherService.validate(formData.voucher_code);
      setAppliedVoucher(v);
    } catch (err: any) {
      setAppliedVoucher(null);
      setVoucherError(err.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const item = items.find(i => i.id === formData.item_id);
    if (!item) return;

    let price = 0;
    if (formData.duration_hours === 3) price = item.price_3h;
    else if (formData.duration_hours === 6) price = item.price_6h;
    else if (formData.duration_hours === 12) price = item.price_12h;
    else if (formData.duration_hours === 24) price = item.price_24h;
    else {
      // Logic untuk lebih dari 24 jam: kelipatan harga 24 jam
      const days = formData.duration_hours / 24;
      price = item.price_24h * days;
    }

    let discountAmount = 0;
    if (appliedVoucher) {
      if (appliedVoucher.type === 'nominal') {
        discountAmount = appliedVoucher.value;
      } else {
        discountAmount = (price * appliedVoucher.value) / 100;
      }
      if (discountAmount > price) discountAmount = price;
    }

    try {
      await TransactionService.create({
        customer_id: formData.customer_id,
        item_id: formData.item_id,
        start_date: formData.start_date,
        duration_hours: formData.duration_hours,
        total_price: price - discountAmount,
        discount_amount: discountAmount,
        voucher_code: appliedVoucher ? appliedVoucher.code : undefined,
        status: 'active'
      });
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const calculateLateFee = (tx: Transaction) => {
    const endDate = new Date(new Date(tx.start_date).getTime() + tx.duration_hours * 60 * 60 * 1000);
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, endDate);
    
    // Toleransi 1 jam (60 menit)
    if (diffMinutes <= 60) return 0;
    
    // Denda 10.000 / jam mulai dihitung di jam ke-2, pembulatan ke atas (misal terlambat 61 menit dihitung jam ke-2 = 1 jam denda)
    const hoursToCharge = Math.ceil(diffMinutes / 60) - 1;
    const rawPenalty = hoursToCharge * 10000;
    
    // Dapatkan harga sewa awal untuk durasi transaksi tersebut
    let originalPrice = 0;
    const item = tx.item;
    if (item) {
      if (tx.duration_hours === 3) originalPrice = item.price_3h;
      else if (tx.duration_hours === 6) originalPrice = item.price_6h;
      else if (tx.duration_hours === 12) originalPrice = item.price_12h;
      else if (tx.duration_hours === 24) originalPrice = item.price_24h;
      else {
        const days = tx.duration_hours / 24;
        originalPrice = item.price_24h * days;
      }
    }
    
    if (!item) return rawPenalty;

    // Jika nominal denda melebihi harga sewa awal
    if (rawPenalty > originalPrice) {
      const N = Math.ceil(hoursToCharge / 24);
      if (tx.duration_hours < 24) {
        // Untuk sewa kurang dari 24 jam, total biaya disesuaikan ke kelipatan sewa 24 jam.
        // Sehingga denda = (N * harga sewa 24 jam) - harga sewa awal.
        return (N * item.price_24h) - originalPrice;
      } else {
        // Untuk sewa 24 jam atau lebih, denda disesuaikan ke kelipatan sewa 24 jam (N * harga sewa 24 jam).
        return N * item.price_24h;
      }
    }
    
    return rawPenalty;
  };

  const getReturnCalculation = (tx: Transaction, returnDateStr: string) => {
    const endDate = new Date(new Date(tx.start_date).getTime() + tx.duration_hours * 60 * 60 * 1000);
    const returnDate = returnDateStr ? new Date(returnDateStr) : new Date();
    const diffMinutes = differenceInMinutes(returnDate, endDate);
    
    let penalty = 0;
    if (diffMinutes > 60) {
      // Denda 10.000 / jam mulai dihitung di jam ke-2, pembulatan ke atas
      const hoursToCharge = Math.ceil(diffMinutes / 60) - 1;
      const rawPenalty = hoursToCharge * 10000;
      
      let originalPrice = 0;
      const item = tx.item;
      if (item) {
        if (tx.duration_hours === 3) originalPrice = item.price_3h;
        else if (tx.duration_hours === 6) originalPrice = item.price_6h;
        else if (tx.duration_hours === 12) originalPrice = item.price_12h;
        else if (tx.duration_hours === 24) originalPrice = item.price_24h;
        else {
          const days = tx.duration_hours / 24;
          originalPrice = item.price_24h * days;
        }
      }
      
      if (item) {
        if (rawPenalty > originalPrice) {
          const N = Math.ceil(hoursToCharge / 24);
          if (tx.duration_hours < 24) {
            penalty = (N * item.price_24h) - originalPrice;
          } else {
            penalty = N * item.price_24h;
          }
        } else {
          penalty = rawPenalty;
        }
      } else {
        penalty = rawPenalty;
      }
    }
    
    const isLate = penalty > 0;
    const finalTotal = tx.total_price + penalty;
    
    let lateDurationStr = '';
    if (diffMinutes > 0) {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      lateDurationStr = `${hours > 0 ? `${hours} jam ` : ''}${mins} menit`;
    }
    
    return { penalty, isLate, finalTotal, lateDurationStr };
  };

  const getStatusBadge = (tx: Transaction) => {
    if (tx.status === 'completed') {
      return <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-md uppercase border border-emerald-200">Selesai</span>;
    }
    if (tx.status === 'late') {
      return <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-bold rounded-md uppercase border border-amber-200">Terlambat Dikembalikan</span>;
    }
    
    const endDate = new Date(new Date(tx.start_date).getTime() + tx.duration_hours * 60 * 60 * 1000);
    const now = new Date();
    
    if (isAfter(now, endDate)) {
      return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-md uppercase flex items-center border border-red-200"><AlertTriangle className="w-3 h-3 mr-1"/> Terlambat</span>;
    }
    
    return <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-md uppercase border border-blue-200">Aktif</span>;
  };

  const renderCountdownOrPenalty = (tx: Transaction) => {
    if (tx.status === 'completed' || tx.status === 'late') {
      return (
        <div className="text-slate-500 text-xs font-medium mt-1">
          <span className="text-slate-400 text-[11px] block">Dikembalikan pada:</span>
          <span className="text-slate-700 font-semibold">
            {tx.actual_return_date ? format(new Date(tx.actual_return_date), 'dd MMM yyyy HH:mm') : '--'}
          </span>
        </div>
      );
    }
    
    const endDate = new Date(new Date(tx.start_date).getTime() + tx.duration_hours * 60 * 60 * 1000);
    const now = new Date();
    const isOverdue = isAfter(now, endDate);
    
    if (isOverdue) {
      const penalty = calculateLateFee(tx);
      
      // Hitung apakah denda disesuaikan ke tarif 24 jam karena melebihi harga sewa awal
      let isAdjusted = false;
      let originalPrice = 0;
      const item = tx.item;
      if (item) {
        if (tx.duration_hours === 3) originalPrice = item.price_3h;
        else if (tx.duration_hours === 6) originalPrice = item.price_6h;
        else if (tx.duration_hours === 12) originalPrice = item.price_12h;
        else if (tx.duration_hours === 24) originalPrice = item.price_24h;
        else {
          const days = tx.duration_hours / 24;
          originalPrice = item.price_24h * days;
        }
        
        const diffMinutes = differenceInMinutes(now, endDate);
        const hoursToCharge = Math.ceil(Math.max(0, diffMinutes) / 60);
        const rawPenalty = hoursToCharge * 10000;
        
        if (rawPenalty > originalPrice) {
          isAdjusted = true;
        }
      }

      return (
        <div className="space-y-1 mt-1">
          <div>
            <LateTimerDisplay endDate={endDate} />
          </div>
          <div className="text-red-600 font-bold text-[11px] leading-tight">
            {penalty > 0 ? `Estimasi Denda: ${formatCurrency(penalty)}` : 'Kompensasi Waktu (< 1 jam)'}
          </div>
          {isAdjusted && (
            <div className="text-[10px] text-red-500 font-semibold italic leading-tight">
              *Disesuaikan ke tarif 24 jam (melebihi sewa awal)
            </div>
          )}
        </div>
      );
    }
    
    return (
      <div className="mt-1">
        <CountdownDisplay endDate={endDate} />
      </div>
    );
  };

  const filteredTransactions = transactions.filter((tx) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const customerName = tx.customer?.name || '';
    const itemName = tx.item?.name || '';
    const itemSerial = tx.item?.serial_number || '';
    const voucherCode = tx.voucher_code || '';

    const matchesSearch = 
      customerName.toLowerCase().includes(searchLower) ||
      itemName.toLowerCase().includes(searchLower) ||
      itemSerial.toLowerCase().includes(searchLower) ||
      voucherCode.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    if (timeFilter === 'all') return true;

    if (!tx.start_date) return false;
    const txDate = new Date(tx.start_date);
    const now = new Date();

    if (timeFilter === 'daily') {
      return isToday(txDate);
    }
    if (timeFilter === 'weekly') {
      return isSameWeek(txDate, now, { weekStartsOn: 1 });
    }
    if (timeFilter === 'monthly') {
      return isSameMonth(txDate, now);
    }
    if (timeFilter === 'yearly') {
      return isSameYear(txDate, now);
    }
    if (timeFilter === 'custom') {
      if (!customDate) return true;
      return format(txDate, 'yyyy-MM-dd') === customDate;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Transaksi Sewa</h1>
          <p className="text-sm text-slate-500">Buat transaksi baru dan pantau pengembalian barang.</p>
        </div>
        <button
          onClick={() => {
             setFormData({ 
               customer_id: customers[0]?.id || '', 
               item_id: items.filter(i => i.status === 'available')[0]?.id || '', 
               start_date: format(new Date(), "yyyy-MM-dd'T'HH:mm"), 
               duration_hours: 24,
               voucher_code: ''
             });
             setAppliedVoucher(null);
             setVoucherError('');
             setIsAddingCustomer(false);
             setNewCustName('');
             setNewCustPhone('');
             setNewCustAddress('');
             setCustSaveError('');
             setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Sewa Baru
        </button>
      </div>

      {/* Search and Time Filter Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Cari penyewa, nama barang, S/N, atau voucher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none"
          />
        </div>

        {/* Time Filters */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100 self-start md:self-auto">
          {[
            { key: 'all', label: 'Semua Waktu' },
            { key: 'daily', label: 'Harian' },
            { key: 'weekly', label: 'Mingguan' },
            { key: 'monthly', label: 'Bulanan' },
            { key: 'yearly', label: 'Tahunan' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => {
                setTimeFilter(item.key as any);
                setCustomDate(''); // Reset custom date when clicking other filters
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 cursor-pointer",
                timeFilter === item.key
                  ? "bg-white text-blue-600 shadow-sm border border-slate-200/50 font-bold"
                  : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
              )}
            >
              {item.label}
            </button>
          ))}
          
          <div className="relative flex items-center ml-1 border-l border-slate-200 pl-1.5">
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                const val = e.target.value;
                setCustomDate(val);
                if (val) {
                  setTimeFilter('custom');
                } else {
                  setTimeFilter('all');
                }
              }}
              className={cn(
                "px-2 py-1 border rounded-md text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium cursor-pointer transition-all",
                timeFilter === 'custom'
                  ? "border-blue-500 ring-2 ring-blue-500/10 text-blue-600 font-bold"
                  : "border-slate-200 hover:border-slate-300"
              )}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Barang & Pelanggan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Tanggal & Durasi</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status & Waktu</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Biaya</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (<tr><td colSpan={5} className="px-5 py-3 text-center">Loading...</td></tr>) : 
                filteredTransactions.length === 0 ? (<tr><td colSpan={5} className="px-5 py-3 text-center text-slate-500">Tidak ada transaksi.</td></tr>) :
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className={cn("transition-colors", (tx.status === 'completed' || tx.status === 'late') ? "bg-slate-50/50 opacity-60 grayscale-[0.2]" : "bg-white hover:bg-slate-50")}>
                    <td className="px-5 py-3 border-b border-transparent">
                      <div className="font-medium text-slate-900">
                        {tx.item?.category && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded mr-1.5 font-semibold">[{tx.item.category}]</span>}
                        {tx.item?.name || 'Unknown'}
                      </div>
                      <div className="text-sm text-slate-500">Penyewa: {tx.customer?.name || 'Unknown'}</div>
                    </td>
                    <td className="px-5 py-3 border-b border-transparent">
                      <div className="text-sm text-slate-900">{format(new Date(tx.start_date), 'dd MMM yyyy HH:mm')}</div>
                      <div className="text-sm text-slate-500">{tx.duration_hours} jam</div>
                    </td>
                    <td className="px-5 py-3 border-b border-transparent">
                      <div className="mb-1">{getStatusBadge(tx)}</div>
                      {renderCountdownOrPenalty(tx)}
                    </td>
                    <td className="px-5 py-3 text-right border-b border-transparent">
                      <div className="font-bold text-slate-900">{formatCurrency(tx.total_price)}</div>
                    </td>
                    <td className="px-5 py-3 text-right border-b border-transparent">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setPreviewTx(tx)}
                          className="inline-flex items-center text-xs bg-slate-50 text-slate-700 font-medium px-2.5 py-1.5 rounded border border-slate-200 hover:bg-slate-100"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> Struk
                        </button>
                        {(tx.status !== 'completed' && tx.status !== 'late') && (
                          <button
                            onClick={() => {
                              setActiveReturnTx(tx);
                              setReturnTimeMode('now');
                              setCustomReturnTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
                            }}
                            className="inline-flex items-center text-xs bg-emerald-50 text-emerald-700 font-medium px-2.5 py-1.5 rounded border border-emerald-200 hover:bg-emerald-100"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" /> Kembalikan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
             <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)} />
             <div className="relative bg-white rounded-xl max-w-md w-full p-6 text-left shadow-lg border border-slate-200 transform transition-all">
               <h3 className="text-lg font-bold text-slate-900 mb-4">Sewa Barang Baru</h3>
               <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    {!isAddingCustomer ? (
                      <>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-semibold text-slate-700">Pelanggan</label>
                          <button 
                            type="button" 
                            onClick={() => {
                              setIsAddingCustomer(true);
                              setNewCustName('');
                              setNewCustPhone('');
                              setNewCustAddress('');
                              setCustSaveError('');
                            }} 
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                          >
                            + Pelanggan Baru
                          </button>
                        </div>
                        <select
                          required
                          value={formData.customer_id}
                          onChange={e => setFormData(p => ({ ...p, customer_id: e.target.value }))}
                          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                        >
                          <option value="">Pilih Pelanggan...</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>)}
                        </select>
                      </>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-1.5 mb-1.5">
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tambah Pelanggan Baru</span>
                          <button
                            type="button"
                            onClick={() => setIsAddingCustomer(false)}
                            className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold"
                          >
                            Batal
                          </button>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Nama Lengkap</label>
                            <input
                              type="text"
                              value={newCustName}
                              onChange={e => setNewCustName(e.target.value)}
                              placeholder="Nama..."
                              className="block w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">No. HP</label>
                            <input
                              type="text"
                              value={newCustPhone}
                              onChange={e => setNewCustPhone(e.target.value)}
                              placeholder="No. HP..."
                              className="block w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-0.5">Alamat</label>
                            <textarea
                              value={newCustAddress}
                              onChange={e => setNewCustAddress(e.target.value)}
                              placeholder="Alamat..."
                              rows={2}
                              className="block w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white resize-none"
                            />
                          </div>
                        </div>
                        
                        {custSaveError && <p className="text-[10px] text-red-600 font-medium">{custSaveError}</p>}
                        
                        <div className="flex justify-end gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={handleSaveCustomer}
                            disabled={!newCustName.trim() || !newCustPhone.trim() || !newCustAddress.trim()}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                          >
                            Simpan & Pilih
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Barang (Hanya yang Tersedia)</label>
                    <select
                      required
                      value={formData.item_id}
                      onChange={e => setFormData(p => ({ ...p, item_id: e.target.value }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="">Pilih Barang...</option>
                       {items.filter(i => i.status === 'available').map(i => (
                        <option key={i.id} value={i.id}>[{i.category || 'iPhone'}] {i.name} - S/N: {i.serial_number}</option>
                      ))}
                    </select>
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Waktu Mulai</label>
                      <input 
                        type="datetime-local" required 
                        value={formData.start_date}
                        onChange={e => setFormData(p => ({ ...p, start_date: e.target.value }))}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Durasi Sewa</label>
                      <select 
                        required 
                        value={formData.duration_hours}
                        onChange={e => setFormData(p => ({ ...p, duration_hours: parseInt(e.target.value) || 24 }))}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white" 
                      >
                        {durationOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {formData.item_id && (
                    <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-200">
                      <span className="text-sm font-medium text-slate-600">Subtotal Sewa</span>
                      <span className="text-lg font-bold text-slate-900">
                        {(() => {
                          const item = items.find(i => i.id === formData.item_id);
                          if (!item) return formatCurrency(0);
                          let price = 0;
                          if (formData.duration_hours === 3) price = item.price_3h;
                          else if (formData.duration_hours === 6) price = item.price_6h;
                          else if (formData.duration_hours === 12) price = item.price_12h;
                          else if (formData.duration_hours === 24) price = item.price_24h;
                          else {
                            const days = formData.duration_hours / 24;
                            price = item.price_24h * days;
                          }
                          return formatCurrency(price);
                        })()}
                      </span>
                    </div>
                  )}

                  {formData.item_id && (
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Kode Voucher (Opsional)</label>
                      <div className="flex space-x-2">
                        <input
                          type="text" value={formData.voucher_code}
                          onChange={e => setFormData(p => ({ ...p, voucher_code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                          disabled={!!appliedVoucher}
                          className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                          placeholder="Masukkan kode voucher"
                        />
                        {!appliedVoucher ? (
                          <button type="button" onClick={handleValidateVoucher} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors whitespace-nowrap">
                            Terapkan
                          </button>
                        ) : (
                          <button type="button" onClick={() => { setAppliedVoucher(null); setFormData(p => ({...p, voucher_code: ''})); }} className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors whitespace-nowrap">
                            Hapus
                          </button>
                        )}
                      </div>
                      {voucherError && <p className="text-xs text-red-600 mt-1.5">{voucherError}</p>}
                      {appliedVoucher && (
                        <p className="text-xs text-emerald-600 mt-1.5 font-medium">
                          Voucher berhasil diterapkan! Diskon {appliedVoucher.type === 'nominal' ? formatCurrency(appliedVoucher.value) : `${appliedVoucher.value}%`}.
                        </p>
                      )}
                    </div>
                  )}

                  {formData.item_id && appliedVoucher && (
                    <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-200">
                      <span className="text-sm font-bold text-blue-800">Total Pembayaran</span>
                      <span className="text-xl font-bold text-blue-900">
                        {(() => {
                          const item = items.find(i => i.id === formData.item_id);
                          if (!item) return formatCurrency(0);
                          let price = 0;
                          if (formData.duration_hours === 3) price = item.price_3h;
                          else if (formData.duration_hours === 6) price = item.price_6h;
                          else if (formData.duration_hours === 12) price = item.price_12h;
                          else if (formData.duration_hours === 24) price = item.price_24h;
                          else {
                            const days = formData.duration_hours / 24;
                            price = item.price_24h * days;
                          }
                          
                          let discountAmount = 0;
                          if (appliedVoucher.type === 'nominal') {
                            discountAmount = appliedVoucher.value;
                          } else {
                            discountAmount = (price * appliedVoucher.value) / 100;
                          }
                          if (discountAmount > price) discountAmount = price;
                          
                          return formatCurrency(price - discountAmount);
                        })()}
                      </span>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end space-x-3">
                     <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors cursor-pointer">Batal</button>
                     <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer">Proses Sewa</button>
                  </div>
               </form>
             </div>
          </div>
        </div>
      )}

      {previewTx && (() => {
        const getBasePrice = (tx: Transaction) => {
          const item = tx.item;
          if (!item) return 0;
          if (tx.duration_hours === 3) return item.price_3h;
          if (tx.duration_hours === 6) return item.price_6h;
          if (tx.duration_hours === 12) return item.price_12h;
          if (tx.duration_hours === 24) return item.price_24h;
          const days = tx.duration_hours / 24;
          return item.price_24h * days;
        };

        const basePrice = getBasePrice(previewTx);
        const isFinished = previewTx.status === 'completed' || previewTx.status === 'late';
        const lateFee = isFinished 
          ? Math.max(0, previewTx.total_price - (basePrice - (previewTx.discount_amount || 0)))
          : calculateLateFee(previewTx);
        const finalTotalPrice = isFinished ? previewTx.total_price : (previewTx.total_price + lateFee);

        // Cek apakah denda disesuaikan karena melebihi harga sewa awal
        let isAdjustedReceipt = false;
        if (previewTx.item) {
          const item = previewTx.item;
          const endDate = new Date(new Date(previewTx.start_date).getTime() + previewTx.duration_hours * 60 * 60 * 1000);
          
          let rawPenalty = 0;
          if (isFinished) {
            if (previewTx.actual_return_date) {
              const returnDate = new Date(previewTx.actual_return_date);
              const diffMinutes = differenceInMinutes(returnDate, endDate);
              if (diffMinutes > 60) {
                const hoursToCharge = Math.ceil(diffMinutes / 60);
                rawPenalty = hoursToCharge * 10000;
              }
            } else {
              rawPenalty = lateFee;
            }
          } else {
            const now = new Date();
            const diffMinutes = differenceInMinutes(now, endDate);
            if (diffMinutes > 60) {
              const hoursToCharge = Math.ceil(diffMinutes / 60);
              rawPenalty = hoursToCharge * 10000;
            }
          }

          if (rawPenalty > basePrice) {
            isAdjustedReceipt = true;
          }
        }

        // Hitung waktu keterlambatan untuk dicantumkan di struk
        let lateDurationStr = '';
        if (lateFee > 0) {
          const endDate = new Date(new Date(previewTx.start_date).getTime() + previewTx.duration_hours * 60 * 60 * 1000);
          if (!isFinished) {
            const now = new Date();
            const diffMinutes = differenceInMinutes(now, endDate);
            if (diffMinutes > 0) {
              const hours = Math.floor(diffMinutes / 60);
              const mins = diffMinutes % 60;
              lateDurationStr = `${hours > 0 ? `${hours} jam ` : ''}${mins} menit`;
            }
          } else {
            if (previewTx.actual_return_date) {
              const returnDate = new Date(previewTx.actual_return_date);
              const diffMinutes = differenceInMinutes(returnDate, endDate);
              if (diffMinutes > 0) {
                const hours = Math.floor(diffMinutes / 60);
                const mins = diffMinutes % 60;
                lateDurationStr = `${hours > 0 ? `${hours} jam ` : ''}${mins} menit`;
              }
            } else {
              const price24h = previewTx.item?.price_24h || 1;
              const N = previewTx.duration_hours < 24
                ? Math.round((lateFee + basePrice) / price24h)
                : Math.round(lateFee / price24h);
              lateDurationStr = `± ${N * 24} jam`;
            }
          }
        }

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto no-print">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setPreviewTx(null)} />
              <div className="relative bg-slate-100 rounded-xl w-[340px] p-6 text-left shadow-lg border border-slate-200 transform transition-all flex flex-col items-center">
                {/* Receipt wrapper to look like paper */}
                <div id="print-area" className="bg-white p-6 shadow-sm pb-8 w-[300px] border border-slate-200 print-only">
                    <div className="text-center font-mono mb-6 text-slate-900 border-b-2 border-dashed border-slate-300 pb-4">
                       <h2 className="text-xl font-bold mb-2">PINJAM BARANG</h2>
                       <p className="text-xs">Jl. Sudirman No. 123, Jakarta</p>
                       <p className="text-xs mb-2">Telp: 0812-3456-7890</p>
                       <p className="text-xs">Kasir: Admin Kasir</p>
                       <p className="text-xs">Tgl: {format(new Date(previewTx.start_date), 'dd/MM/yyyy HH:mm')}</p>
                       <p className="text-xs">No: TRX-{previewTx.id.substring(0,8).toUpperCase()}</p>
                    </div>
                    
                    <div className="font-mono text-xs text-slate-900 space-y-2 mb-6 border-b-2 border-dashed border-slate-300 pb-4">
                      <div className="mb-2">
                        <span className="font-semibold">Pelanggan:</span> {previewTx.customer?.name}
                      </div>
                      <div className="font-bold flex justify-between">
                          <span>{previewTx.item?.name}</span>
                      </div>
                      <div className="flex justify-between mt-1">
                          <span>
                            {previewTx.duration_hours} jam (@ {(() => {
                              if (previewTx.duration_hours === 3) return formatCurrency(previewTx.item?.price_3h || 0);
                              if (previewTx.duration_hours === 6) return formatCurrency(previewTx.item?.price_6h || 0);
                              if (previewTx.duration_hours === 12) return formatCurrency(previewTx.item?.price_12h || 0);
                              return formatCurrency(previewTx.item?.price_24h || 0);
                            })()})
                          </span>
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        S/N: {previewTx.item?.serial_number || '-'}
                      </div>
                    </div>

                    {/* Breakdown Biaya */}
                    <div className="font-mono text-xs text-slate-900 space-y-1 mb-6 border-b-2 border-dashed border-slate-300 pb-4">
                      {isAdjustedReceipt ? (
                        previewTx.duration_hours < 24 ? (
                          <>
                            <div className="flex justify-between font-semibold text-red-600">
                              <span>Sewa & Denda (Disesuaikan ke {Math.round((lateFee + basePrice) / (previewTx.item?.price_24h || 1))} x 24 Jam):</span>
                              <span>{formatCurrency(finalTotalPrice)}</span>
                            </div>
                            {lateDurationStr && (
                              <div className="text-[10px] text-slate-500 font-mono text-right leading-tight">
                                Waktu Keterlambatan: {lateDurationStr}
                              </div>
                            )}
                            <div className="text-[9px] text-red-500 font-mono text-right mt-0.5 mb-1.5 leading-tight">
                              *Disesuaikan ke kelipatan tarif 24 jam karena denda melebihi harga sewa awal.
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between">
                              <span>Subtotal Sewa:</span>
                              <span>{formatCurrency(basePrice)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-red-600">
                              <span>Denda (Disesuaikan ke {Math.round(lateFee / (previewTx.item?.price_24h || 1))} x 24 Jam):</span>
                              <span>{formatCurrency(lateFee)}</span>
                            </div>
                            {lateDurationStr && (
                              <div className="text-[10px] text-slate-500 font-mono text-right leading-tight">
                                Waktu Keterlambatan: {lateDurationStr}
                              </div>
                            )}
                            <div className="text-[9px] text-red-500 font-mono text-right mt-0.5 mb-1.5 leading-tight">
                              *Disesuaikan ke kelipatan tarif 24 jam karena denda melebihi harga sewa.
                            </div>
                          </>
                        )
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span>Subtotal Sewa:</span>
                            <span>{formatCurrency(basePrice)}</span>
                          </div>
                          {lateFee > 0 && (
                            <>
                              <div className="flex justify-between text-red-600 font-semibold">
                                <span>Denda Terlambat:</span>
                                <span>{formatCurrency(lateFee)}</span>
                              </div>
                              {lateDurationStr && (
                                <div className="text-[10px] text-slate-500 font-mono text-right -mt-1 leading-tight">
                                  Waktu Keterlambatan: {lateDurationStr}
                                </div>
                              )}
                            </>
                          )}
                        </>
                      )}
                      {previewTx.discount_amount && previewTx.discount_amount > 0 ? (
                        <div className="flex justify-between text-emerald-600">
                          <span>Diskon ({previewTx.voucher_code || 'Promo'}):</span>
                          <span>-{formatCurrency(previewTx.discount_amount)}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className="font-mono text-sm text-slate-900">
                        <div className="flex justify-between font-bold text-base border-b-2 border-dashed border-slate-300 pb-4 mb-4">
                            <span>TOTAL</span>
                            <span>{formatCurrency(finalTotalPrice)}</span>
                        </div>
                        <div className="text-center text-[11px] space-y-1">
                            <p>Terima kasih !</p>
                            <p>Simpan struk ini sebagai</p>
                            <p>bukti sewa sah.</p>
                        </div>
                    </div>
                </div>
                <div className="mt-6 flex justify-between gap-3 w-full">
                   <button onClick={() => setPreviewTx(null)} className="flex-1 py-2.5 text-slate-600 bg-white border border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm">Tutup</button>
                   <button onClick={() => window.print()} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm"><Printer className="w-4 h-4"/> Cetak Struk</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {activeReturnTx && (() => {
        const returnDateStr = returnTimeMode === 'now' 
          ? format(new Date(), "yyyy-MM-dd'T'HH:mm")
          : customReturnTime;
          
        const { penalty, isLate, finalTotal, lateDurationStr } = getReturnCalculation(activeReturnTx, returnDateStr);
        const endDate = new Date(new Date(activeReturnTx.start_date).getTime() + activeReturnTx.duration_hours * 60 * 60 * 1000);
        
        const handleProcessReturn = async () => {
          try {
            const updates: Partial<Transaction> = {
              status: isLate ? 'late' : 'completed',
              actual_return_date: format(new Date(returnDateStr), "yyyy-MM-dd'T'HH:mm:ss"),
              total_price: finalTotal
            };
            await TransactionService.update(activeReturnTx.id, updates);
            setActiveReturnTx(null);
            fetchData();
            const msg = returnTimeMode === 'now' 
              ? 'Berhasil menyelesaikan transaksi.' 
              : 'Berhasil menyelesaikan transaksi dengan waktu pengembalian kustom.';
            alert(msg);
          } catch (err) {
            console.error(err);
            alert('Gagal menyelesaikan transaksi.');
          }
        };

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setActiveReturnTx(null)} />
              <div className="relative bg-white rounded-xl max-w-md w-full p-6 text-left shadow-lg border border-slate-200 transform transition-all">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Konfirmasi Pengembalian Barang</h3>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm space-y-1">
                    <div><span className="font-semibold text-slate-600">Barang:</span> {activeReturnTx.item?.name} (S/N: {activeReturnTx.item?.serial_number})</div>
                    <div><span className="font-semibold text-slate-600">Penyewa:</span> {activeReturnTx.customer?.name}</div>
                    <div><span className="font-semibold text-slate-600">Mulai Sewa:</span> {format(new Date(activeReturnTx.start_date), 'dd MMM yyyy HH:mm')} ({activeReturnTx.duration_hours} jam)</div>
                    <div><span className="font-semibold text-slate-600">Jadwal Kembali:</span> {format(endDate, 'dd MMM yyyy HH:mm')}</div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Metode Waktu Pengembalian</label>
                    <div className="flex gap-4 mb-3">
                      <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="returnTimeMode"
                          checked={returnTimeMode === 'now'}
                          onChange={() => setReturnTimeMode('now')}
                          className="mr-2 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        Waktu Sekarang (Real-time)
                      </label>
                      <label className="flex items-center text-sm font-medium text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="returnTimeMode"
                          checked={returnTimeMode === 'custom'}
                          onChange={() => {
                            setReturnTimeMode('custom');
                            if (!customReturnTime) {
                              setCustomReturnTime(format(new Date(activeReturnTx.start_date), "yyyy-MM-dd'T'HH:mm"));
                            }
                          }}
                          className="mr-2 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                        />
                        Waktu Kustom (Manual)
                      </label>
                    </div>

                    {returnTimeMode === 'custom' && (
                      <input
                        type="datetime-local"
                        required
                        value={customReturnTime}
                        onChange={e => setCustomReturnTime(e.target.value)}
                        className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      />
                    )}
                  </div>

                  <div className="border-t border-slate-200 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">Status Pengembalian:</span>
                      <span className={cn(
                        "px-2 py-0.5 text-xs font-bold rounded uppercase",
                        isLate ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      )}>
                        {isLate ? "Terlambat" : "Tepat Waktu"}
                      </span>
                    </div>

                    {isLate && (
                      <>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600 font-medium">Waktu Keterlambatan:</span>
                          <span className="text-slate-900 font-semibold">{lateDurationStr}</span>
                        </div>
                        <div className="flex justify-between text-sm text-red-600 font-semibold">
                          <span>Denda Terlambat:</span>
                          <span>{formatCurrency(penalty)}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-1 border-t border-slate-100">
                      <span>Total Pembayaran Akhir:</span>
                      <span className="text-lg text-blue-600">{formatCurrency(finalTotal)}</span>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveReturnTx(null)}
                      className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessReturn}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Selesaikan Transaksi
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
