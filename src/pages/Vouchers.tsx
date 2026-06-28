import React, { useState, useEffect } from 'react';
import { VoucherService } from '../services/voucherService';
import { Voucher } from '../types';
import { Plus, Edit2, Trash2, Tag } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';

export default function Vouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Voucher, 'id' | 'created_at'>>({
    code: '',
    type: 'nominal',
    value: 0,
    is_active: true,
    expires_at: ''
  });

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const data = await VoucherService.getAll();
      setVouchers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...formData,
        expires_at: formData.expires_at ? formData.expires_at : null
      };
      if (editingId) {
        await VoucherService.update(editingId, data);
      } else {
        await VoucherService.create(data);
      }
      setIsModalOpen(false);
      fetchVouchers();
    } catch (err: any) {
      console.error(err);
      alert('Gagal menyimpan voucher: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus voucher ini?')) {
      try {
        await VoucherService.delete(id);
        fetchVouchers();
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus voucher.');
      }
    }
  };

  const openNew = () => {
    setFormData({ code: '', type: 'nominal', value: 0, is_active: true, expires_at: '' });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (v: Voucher) => {
    setFormData({ 
      code: v.code, 
      type: v.type, 
      value: v.value, 
      is_active: v.is_active,
      expires_at: v.expires_at ? format(new Date(v.expires_at), "yyyy-MM-dd'T'HH:mm") : ''
    });
    setEditingId(v.id);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kode Voucher</h1>
          <p className="text-sm text-slate-500">Kelola promo dan potongan harga untuk pelanggan.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Voucher
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Kode Voucher</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nilai Potongan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {loading ? (<tr><td colSpan={4} className="px-5 py-3 text-center">Loading...</td></tr>) : 
                vouchers.length === 0 ? (<tr><td colSpan={4} className="px-5 py-3 text-center text-slate-500">Belum ada kode voucher.</td></tr>) :
                vouchers.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 border-b border-transparent">
                      <div className="flex items-center font-bold text-slate-900 tracking-wider">
                        <Tag className="w-4 h-4 text-blue-500 mr-2" />
                        {v.code}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 space-y-0.5">
                        <div>Dibuat: {v.created_at ? format(new Date(v.created_at), 'dd MMM yyyy') : '-'}</div>
                        <div>
                          Masa Berlaku:{' '}
                          {v.expires_at ? (
                            <span className={cn(
                              "font-semibold",
                              new Date(v.expires_at) < new Date() ? "text-red-600 font-bold" : "text-slate-700"
                            )}>
                              {format(new Date(v.expires_at), 'dd MMM yyyy HH:mm')}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Selamanya</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 border-b border-transparent">
                      <div className="font-semibold text-emerald-600">
                        {v.type === 'nominal' ? formatCurrency(v.value) : `${v.value}%`}
                      </div>
                      <div className="text-xs text-slate-500">Tipe: {v.type === 'nominal' ? 'Nominal (Rp)' : 'Persentase (%)'}</div>
                    </td>
                    <td className="px-5 py-3 border-b border-transparent">
                      {v.is_active ? (
                        v.expires_at && new Date(v.expires_at) < new Date() ? (
                          <span className="px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider bg-red-100 text-red-700 border border-red-200">
                            Kadaluwarsa
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                            Aktif
                          </span>
                        )
                      ) : (
                        <span className="px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider bg-slate-100 text-slate-500 border border-slate-200">
                          Nonaktif
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right border-b border-transparent">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => openEdit(v)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(v.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
            <div className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg border border-slate-200 rounded-xl">
              <h3 className="text-lg font-bold leading-6 text-slate-900 mb-4">
                {editingId ? 'Edit Voucher' : 'Tambah Voucher Baru'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Kode Voucher</label>
                  <input
                    type="text" required value={formData.code}
                    onChange={(e) => setFormData(p => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, '') }))}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono uppercase tracking-widest"
                    placeholder="Contoh: PROMO50K"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tipe Diskon</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(p => ({ ...p, type: e.target.value as 'nominal' | 'percentage' }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="nominal">Nominal (Rp)</option>
                      <option value="percentage">Persentase (%)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Nilai ({formData.type === 'nominal' ? 'Rp' : '%'})
                    </label>
                    <input
                      type="text" inputMode="numeric" required value={formData.value}
                      onChange={(e) => setFormData(p => ({ ...p, value: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Masa Berlaku (Opsional)</label>
                  <input
                    type="datetime-local"
                    value={formData.expires_at || ''}
                    onChange={(e) => setFormData(p => ({ ...p, expires_at: e.target.value }))}
                    className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Kosongkan jika voucher tidak memiliki batas waktu (berlaku selamanya).</p>
                </div>

                <div className="flex items-center mt-2">
                  <input
                    id="is_active"
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(p => ({ ...p, is_active: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-slate-700">
                    Voucher Aktif & Bisa Digunakan
                  </label>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
