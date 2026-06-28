import { useState, useEffect } from 'react';
import { TransactionService } from '../services/transactionService';
import { ItemService } from '../services/itemService';
import { Transaction, Item } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format, isToday, isSameWeek, isSameMonth, isSameYear } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('all');
  const [customDate, setCustomDate] = useState('');

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      try {
        const [txs, iphs] = await Promise.all([
          TransactionService.getAll(),
          ItemService.getAll(),
        ]);
        setTransactions(txs);
        setItems(iphs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, []);

  const filteredTransactions = transactions.filter((tx) => {
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

  const totalRevenue = filteredTransactions.reduce((sum, tx) => sum + tx.total_price, 0);

  // Stats by Item
  const revenueByItem = items.map(item => {
    const txs = filteredTransactions.filter(t => t.item_id === item.id);
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      serial_number: item.serial_number,
      color: item.color,
      totalRevenue: txs.reduce((sum, t) => sum + t.total_price, 0),
      rentCount: txs.length,
      totalHours: txs.reduce((sum, t) => sum + (t.duration_hours || 0), 0)
    };
  }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by revenue DESC

  const exportExcel = () => {
    const formatTxDate = (dateStr?: string) => {
      if (!dateStr) return '-';
      try {
        return format(new Date(dateStr), 'yyyy-MM-dd HH:mm');
      } catch {
        return '-';
      }
    };

    const statusLabels: Record<string, string> = {
      active: 'Aktif',
      completed: 'Selesai',
      late: 'Terlambat'
    };

    const periodStr = timeFilter === 'all' 
      ? 'Semua Waktu' 
      : timeFilter === 'daily' 
      ? 'Harian' 
      : timeFilter === 'weekly' 
      ? 'Mingguan' 
      : timeFilter === 'monthly' 
      ? 'Bulanan' 
      : timeFilter === 'yearly' 
      ? 'Tahunan' 
      : `Kustom (${customDate})`;

    // Calculate Summary Stats
    const uniqueCustomers = new Set(filteredTransactions.map(tx => tx.customer?.name).filter(Boolean)).size;
    const uniqueItems = new Set(filteredTransactions.map(tx => tx.item?.name).filter(Boolean)).size;
    const totalDuration = filteredTransactions.reduce((sum, tx) => sum + (tx.duration_hours || 0), 0);
    const totalDiscount = filteredTransactions.reduce((sum, tx) => sum + (tx.discount_amount || 0), 0);
    const voucherCount = filteredTransactions.filter(tx => tx.voucher_code).length;
    const completedCount = filteredTransactions.filter(tx => tx.status === 'completed').length;
    const lateCount = filteredTransactions.filter(tx => tx.status === 'late').length;

    // Generate HTML rows for table 1 (Detail Transaksi)
    const txRowsHtml = filteredTransactions.map((tx, idx) => {
      const bgColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
      const statusClass = tx.status === 'completed' 
        ? 'background-color: #DEF7EC; color: #03543F; font-weight: bold; border-radius: 4px; border: 1px solid #84E1BC;' 
        : tx.status === 'late'
        ? 'background-color: #FDE8E8; color: #9B1C1C; font-weight: bold; border-radius: 4px; border: 1px solid #F8B4B4;'
        : 'background-color: #EBF5FF; color: #1E429F; font-weight: bold; border-radius: 4px; border: 1px solid #A4CAFE;';
        
      return `
        <tr>
          <td style="text-align: center; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${formatTxDate(tx.start_date)}</td>
          <td style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${tx.customer?.name || '-'}</td>
          <td style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; mso-number-format:'\\@'; background-color: ${bgColor};">${tx.customer?.phone || '-'}</td>
          <td style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${tx.item?.category ? `[${tx.item.category}] ` : ''}${tx.item?.name || '-'}</td>
          <td style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${tx.item?.color || '-'}</td>
          <td style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; mso-number-format:'\\@'; background-color: ${bgColor};">${tx.item?.serial_number || '-'}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${tx.duration_hours || 0}</td>
          <td style="text-align: right; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${formatCurrency(tx.total_price || 0)}</td>
          <td style="text-align: right; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${formatCurrency(tx.discount_amount || 0)}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; padding: 8px; background-color: ${bgColor};">${tx.voucher_code || '-'}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; padding: 6px; background-color: ${bgColor};"><span style="${statusClass} padding: 3px 8px; display: inline-block;">${statusLabels[tx.status] || tx.status}</span></td>
          <td style="border: none; background-color: #ffffff;"></td>
        </tr>
      `;
    }).join('');

    // Generate HTML rows for table 2 (Performa Unit)
    const unitRowsHtml = revenueByItem.map((unit, idx) => {
      const rank = idx + 1;
      let rankStyle = 'background-color: #ffffff;';
      let rankIcon = String(rank);
      if (rank === 1) {
        rankStyle = 'background-color: #FEF08A; font-weight: bold;';
        rankIcon = '🥇 1';
      } else if (rank === 2) {
        rankStyle = 'background-color: #E5E7EB; font-weight: bold;';
        rankIcon = '🥈 2';
      } else if (rank === 3) {
        rankStyle = 'background-color: #FFEDD5; font-weight: bold;';
        rankIcon = '🥉 3';
      }

      return `
        <tr>
          <td style="text-align: center; border: 1px solid #CBD5E1; padding: 8px; ${rankStyle}">${rankIcon}</td>
          <td colspan="2" style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; font-weight: ${rank <= 3 ? 'bold' : 'normal'}; background-color: #ffffff;">${unit.category ? `[${unit.category}] ` : ''}${unit.name}</td>
          <td style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; background-color: #ffffff;">${unit.color || '-'}</td>
          <td colspan="2" style="text-align: left; border: 1px solid #CBD5E1; padding: 8px; mso-number-format:'\\@'; background-color: #ffffff;">${unit.serial_number}</td>
          <td style="text-align: center; border: 1px solid #CBD5E1; padding: 8px; background-color: #ffffff;">${unit.rentCount}x</td>
          <td colspan="2" style="text-align: center; border: 1px solid #CBD5E1; padding: 8px; background-color: #ffffff;">${unit.totalHours} jam</td>
          <td colspan="2" style="text-align: right; border: 1px solid #CBD5E1; padding: 8px; font-weight: bold; background-color: #ffffff;">${formatCurrency(unit.totalRevenue)}</td>
          <td style="border: none; background-color: #ffffff;"></td>
        </tr>
      `;
    }).join('');

    // Complete HTML wrapper
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-excel-workspace" xmlns:x="urn:schemas-microsoft-excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
       <x:ExcelWorkbook>
        <x:ExcelWorksheets>
         <x:ExcelWorksheet>
          <x:Name>Laporan Detail Transaksi</x:Name>
          <x:WorksheetOptions>
           <x:DisplayGridlines/>
          </x:WorksheetOptions>
         </x:ExcelWorksheet>
        </x:ExcelWorksheets>
       </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; }
        td, th { border: 1px solid #CBD5E1; padding: 8px; font-size: 10pt; }
        th { font-weight: bold; color: #FFFFFF; }
      </style>
      </head>
      <body>
        <table>
          <!-- 1. Header Laporan -->
          <tr>
            <td colspan="11" style="background-color: #0F172A; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 14pt; padding: 12px; border: 1px solid #0F172A;">
              📄 LAPORAN DETAIL TRANSAKSI RENTAL BARANG
            </td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>
          <tr>
            <td colspan="11" style="background-color: #0F172A; color: #94A3B8; text-align: center; font-size: 9pt; padding-bottom: 10px; border: 1px solid #0F172A;">
              Periode: ${periodStr} &nbsp;|&nbsp; Tanggal Ekspor: ${format(new Date(), 'dd MMMM yyyy, HH:mm:ss')}
            </td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>
          
          <!-- Spacing -->
          <tr style="height: 15px;"><td colspan="11" style="border: none;"></td><td style="border: none; background-color: #ffffff;"></td></tr>

          <!-- Section 1 Title -->
          <tr>
            <td colspan="11" style="background-color: #1D4ED8; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 11pt; padding: 8px; border: 1px solid #1D4ED8;">
              💾 1. DETAIL TRANSAKSI
            </td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Table 1 Headers -->
          <tr>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Tanggal</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Nama Pelanggan</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">No. HP</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Nama Barang</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Warna</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Serial Number (S/N)</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Durasi (Jam)</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Total Biaya</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Potongan Diskon</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Kode Voucher</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Status</th>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Table 1 Rows -->
          ${txRowsHtml}

          <!-- Table 1 Summary Footer -->
          <tr>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold;"></td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: center;">${uniqueCustomers} Pelanggan</td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold;"></td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: center;">${uniqueItems} Barang</td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold;"></td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold;"></td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: center;">${totalDuration} Jam Total</td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: right;">${formatCurrency(totalRevenue)}</td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: right;">${formatCurrency(totalDiscount)}</td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: center;">${voucherCount} Voucher</td>
            <td style="border: 1px solid #CBD5E1; background-color: #1E293B; color: #FFFFFF; font-weight: bold; text-align: center;">${lateCount} Terlambat</td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Spacing -->
          <tr style="height: 20px;"><td colspan="11" style="border: none;"></td><td style="border: none; background-color: #ffffff;"></td></tr>
          <tr style="height: 20px;"><td colspan="11" style="border: none;"></td><td style="border: none; background-color: #ffffff;"></td></tr>

          <!-- Section 2 Title -->
          <tr>
            <td colspan="11" style="background-color: #1D4ED8; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 11pt; padding: 8px; border: 1px solid #1D4ED8;">
              🏆 2. PERFORMA RENTAL BARANG (RANKING)
            </td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Table 2 Headers -->
          <tr>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Peringkat</th>
            <th colspan="2" style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Nama Barang</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Warna</th>
            <th colspan="2" style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Serial Number (S/N)</th>
            <th style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Frekuensi Sewa</th>
            <th colspan="2" style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Total Durasi</th>
            <th colspan="2" style="border: 1px solid #CBD5E1; color: white; background-color: #2563EB; padding: 8px; font-weight: bold; text-align: center;">Total Pendapatan</th>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Table 2 Rows -->
          ${unitRowsHtml}

          <!-- Spacing -->
          <tr style="height: 20px;"><td colspan="11" style="border: none;"></td><td style="border: none; background-color: #ffffff;"></td></tr>
          <tr style="height: 20px;"><td colspan="11" style="border: none;"></td><td style="border: none; background-color: #ffffff;"></td></tr>

          <!-- Section 3 Title -->
          <tr>
            <td colspan="11" style="background-color: #1D4ED8; color: #FFFFFF; font-weight: bold; text-align: center; font-size: 11pt; padding: 8px; border: 1px solid #1D4ED8;">
              💼 3. RINGKASAN KEUANGAN
            </td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Total Revenue Large Row -->
          <tr>
            <td colspan="6" style="background-color: #15803D; color: #FFFFFF; font-weight: bold; font-size: 13pt; padding: 12px; border: 1px solid #15803D; text-align: left;">
              TOTAL PENDAPATAN KESELURUHAN
            </td>
            <td colspan="5" style="background-color: #15803D; color: #FFFFFF; font-weight: bold; font-size: 16pt; padding: 12px; border: 1px solid #15803D; text-align: right;">
              ${formatCurrency(totalRevenue)}
            </td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Spacing -->
          <tr style="height: 15px;"><td colspan="11" style="border: none;"></td><td style="border: none; background-color: #ffffff;"></td></tr>

          <!-- KPI Cards Grid -->
          <!-- Row 1 -->
          <tr>
            <td style="background-color: #EFF6FF; color: #1E40AF; font-weight: bold; border: 1px solid #CBD5E1;">Total Transaksi</td>
            <td colspan="2" style="background-color: #2563EB; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${filteredTransactions.length} transaksi</td>
            <td style="background-color: #ECFDF5; color: #065F46; font-weight: bold; border: 1px solid #CBD5E1;">Transaksi Selesai</td>
            <td colspan="2" style="background-color: #10B981; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${completedCount} transaksi</td>
            <td colspan="5" style="border: none;"></td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>
          <!-- Row 2 -->
          <tr>
            <td style="background-color: #FEF2F2; color: #9B1C1C; font-weight: bold; border: 1px solid #CBD5E1;">Transaksi Terlambat</td>
            <td colspan="2" style="background-color: #EF4444; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${lateCount} transaksi</td>
            <td style="background-color: #EFF6FF; color: #1E40AF; font-weight: bold; border: 1px solid #CBD5E1;">Total Durasi Sewa</td>
            <td colspan="2" style="background-color: #2563EB; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${totalDuration} jam</td>
            <td colspan="5" style="border: none;"></td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>
          <!-- Row 3 -->
          <tr>
            <td style="background-color: #FFF7ED; color: #9A3412; font-weight: bold; border: 1px solid #CBD5E1;">Diskon Diberikan</td>
            <td colspan="2" style="background-color: #F97316; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${formatCurrency(totalDiscount)}</td>
            <td style="background-color: #ECFDF5; color: #065F46; font-weight: bold; border: 1px solid #CBD5E1;">Pelanggan Aktif</td>
            <td colspan="2" style="background-color: #10B981; color: #FFFFFF; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${uniqueCustomers} pelanggan</td>
            <td colspan="5" style="border: none;"></td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>

          <!-- Spacing -->
          <tr style="height: 15px;"><td colspan="11" style="border: none;"></td><td style="border: none; background-color: #ffffff;"></td></tr>
          
          <!-- Footer Note -->
          <tr>
            <td colspan="11" style="border: none; text-align: center; font-size: 8pt; color: #94A3B8; font-style: italic; padding: 15px;">
              Laporan ini digenerate secara otomatis — Sistem Sewa Barang © 2026
            </td>
            <td style="border: none; background-color: #ffffff;"></td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Download as Excel (.xls) file
    const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_keuangan_${format(new Date(), 'yyyyMMdd_HHmmss')}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div className="py-10 text-center">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan Keuangan</h1>
          <p className="text-sm text-slate-500">Statistik dan performa penyewaan barang.</p>
        </div>
        <button
          onClick={exportExcel}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center transition-colors shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Excel
        </button>
      </div>
 
      {/* Time Filter Panel */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="text-sm font-semibold text-slate-700">Filter Periode Laporan:</div>
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
                setCustomDate('');
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

      <div className="bg-blue-600 rounded-xl p-6 text-white shadow-sm">
        <h3 className="text-blue-100 font-medium mb-1">Total Pendapatan Keseluruhan</h3>
        <div className="text-4xl font-bold">{formatCurrency(totalRevenue)}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         {/* Chart */}
         <div className="bg-white p-5 rounded-xl border border-slate-200">
           <h2 className="text-lg font-bold text-slate-900 mb-6">Pendapatan per Barang</h2>
           <div className="h-[300px] w-full">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={revenueByItem.slice(0, 5)} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                 <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                 <YAxis 
                    axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `Rp ${value / 1000}k`} 
                 />
                 <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value: number) => [formatCurrency(value), 'Pendapatan']}
                 />
                 <Bar dataKey="totalRevenue" fill="#2563EB" radius={[4, 4, 0, 0]} maxBarSize={50} />
               </BarChart>
             </ResponsiveContainer>
           </div>
         </div>

         {/* Table Stats */}
         <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
           <div className="p-5 border-b border-slate-200">
             <h2 className="text-lg font-bold text-slate-900">Performa Barang (Ranking)</h2>
           </div>
           <div className="overflow-y-auto flex-1 p-0">
             <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Barang</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Disewa</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Durasi</th>
                    <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {revenueByItem.map((stat) => (
                    <tr key={stat.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-medium text-slate-900">
                        <div>
                          {stat.category && <span className="text-[10px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded font-semibold mr-1">[{stat.category}]</span>}
                          {stat.name}
                        </div>
                        <div className="text-[11px] text-slate-400 font-normal mt-0.5">
                          {stat.color ? `${stat.color} • ` : ''}S/N: {stat.serial_number}
                        </div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-500 text-right">{stat.rentCount}x</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm text-slate-500 text-right">{stat.totalHours} jam</td>
                      <td className="px-5 py-3 whitespace-nowrap text-sm font-bold text-slate-900 text-right">
                        {formatCurrency(stat.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
           </div>
         </div>
      </div>
    </div>
  );
}
