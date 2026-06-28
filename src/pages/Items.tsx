import React, { useState, useEffect } from 'react';
import { ItemService } from '../services/itemService';
import { TransactionService } from '../services/transactionService';
import { CategoryService } from '../services/categoryService';
import { Item, ItemStatus, Transaction } from '../types';
import { Plus, Edit2, Trash2, Package } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { CountdownDisplay } from '../components/CountdownDisplay';

const statusColors = {
  available: 'bg-green-100 text-green-800',
  rented: 'bg-blue-100 text-blue-800',
  maintenance: 'bg-red-100 text-red-800'
};

const statusLabels = {
  available: 'Tersedia',
  rented: 'Disewakan',
  maintenance: 'Maintenance'
};

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeRentals, setActiveRentals] = useState<Record<string, Transaction>>({});
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<Omit<Item, 'id' | 'created_at'>>({ 
    name: '', serial_number: '', category: 'iPhone', color: '', price_3h: 0, price_6h: 0, price_12h: 0, price_24h: 0, daily_price: 0, status: 'available', image_url: '' 
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const [itemsData, txs, catsData] = await Promise.all([
        ItemService.getAll(),
        TransactionService.getAll(),
        CategoryService.getAll()
      ]);
      setItems(itemsData);
      setCategories(catsData.map(c => c.name));
      
      const rentalsMap: Record<string, Transaction> = {};
      txs.filter(t => t.status !== 'completed' && t.status !== 'late').forEach(tx => {
        rentalsMap[tx.item_id] = tx;
      });
      setActiveRentals(rentalsMap);
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
      let finalImageUrl = formData.image_url;
      
      if (selectedFile) {
        const { StorageService } = await import('../services/storageService');
        finalImageUrl = await StorageService.uploadItemImage(selectedFile);
      }

      // Sync daily_price with price_24h for backwards compatibility/simplicity
      const dataToSave = { ...formData, daily_price: formData.price_24h, image_url: finalImageUrl };

      if (editingId) {
        await ItemService.update(editingId, dataToSave);
      } else {
        await ItemService.create(dataToSave);
      }
      setIsModalOpen(false);
      setSelectedFile(null);
      fetchItems();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data: ' + (err as any).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Yakin ingin menghapus barang ini?')) {
      await ItemService.delete(id);
      fetchItems();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(p => ({ ...p, image_url: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const openNew = () => {
    setFormData({ 
      name: '', serial_number: '', category: categories[0] || 'iPhone', color: '',
      price_3h: 0, price_6h: 0, price_12h: 0, price_24h: 0, 
      daily_price: 0, status: 'available', image_url: '' 
    });
    setSelectedFile(null);
    setEditingId(null);
    setIsModalOpen(true);
  };

  const openEdit = (i: Item) => {
    setFormData({ 
      name: i.name, serial_number: i.serial_number, category: i.category || 'iPhone', color: i.color || '',
      price_3h: i.price_3h || 0, price_6h: i.price_6h || 0, 
      price_12h: i.price_12h || 0, price_24h: i.price_24h || 0,
      daily_price: i.daily_price || i.price_24h, status: i.status, image_url: i.image_url 
    });
    setEditingId(i.id);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Katalog Barang</h1>
          <p className="text-sm text-slate-500">Kelola inventaris dan status rental perangkat.</p>
        </div>
        <button
          onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Tambah Barang
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
           <div className="col-span-full text-center py-10 text-slate-500">Loading...</div>
        ) : items.map((item) => {
          const rental = activeRentals[item.id];
          return (
          <div key={item.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] bg-slate-50 flex-shrink-0 relative overflow-hidden group">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Package className="w-12 h-12" />
                </div>
              )}
              {rental && (
                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center flex-col text-white opacity-0 group-hover:opacity-100 transition-opacity">
                   <div className="text-xs font-semibold mb-1">Sisa Waktu Sewa</div>
                   <CountdownDisplay endDate={new Date(new Date(rental.start_date).getTime() + rental.duration_hours * 60 * 60 * 1000)} />
                   <div className="text-xs mt-2 truncate w-full text-center px-4">Penyewa: {rental.customer?.name}</div>
                </div>
              )}
              <div className="absolute top-2 right-2 flex space-x-1 z-10">
                <button onClick={() => openEdit(item)} className="p-1.5 bg-white/90 rounded-md text-blue-600 hover:bg-white shadow-sm border border-slate-100 cursor-pointer">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-white/90 rounded-md text-red-600 hover:bg-white shadow-sm border border-slate-100 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-5 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-2 gap-2">
                <div>
                  <span className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block w-fit mb-1">
                    {item.category || 'iPhone'}
                  </span>
                  <h3 className="font-bold text-slate-900 leading-tight">{item.name}</h3>
                </div>
                <span className={cn("px-2 py-1 flex-shrink-0 text-[10px] font-bold rounded text-slate-700 bg-slate-100 border border-slate-200 uppercase tracking-wider", statusColors[item.status])}>
                  {statusLabels[item.status]}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1 font-mono">S/N: {item.serial_number}</p>
              <p className="text-xs text-slate-500 mb-4">Warna: <span className="font-medium text-slate-700">{item.color || '-'}</span></p>
              
              <div className="grid grid-cols-2 gap-2 mt-auto pt-4 border-t border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">3 Jam</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(item.price_3h)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">6 Jam</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(item.price_6h)}</span>
                </div>
                <div className="flex flex-col mt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">12 Jam</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(item.price_12h)}</span>
                </div>
                <div className="flex flex-col mt-2">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">24 Jam</span>
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(item.price_24h)}</span>
                </div>
              </div>
            </div>
          </div>
        )})}
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="relative inline-block w-full max-w-md p-6 overflow-hidden text-left align-middle transition-all transform bg-white shadow-lg border border-slate-200 rounded-xl">
              <h3 className="text-lg font-bold leading-6 text-slate-900 mb-4">
                {editingId ? 'Edit Barang' : 'Tambah Barang Baru'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-full">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Barang</label>
                    <input
                      type="text" required value={formData.name}
                      onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Contoh: MacBook Pro M2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(p => ({ ...p, category: e.target.value }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Serial Number (S/N)</label>
                    <input
                      type="text" required value={formData.serial_number}
                      onChange={(e) => setFormData(p => ({ ...p, serial_number: e.target.value }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                      placeholder="Masukkan S/N atau IMEI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Warna / Deskripsi</label>
                    <input
                      type="text" required value={formData.color}
                      onChange={(e) => setFormData(p => ({ ...p, color: e.target.value }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                      placeholder="Contoh: Space Gray"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as ItemStatus }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="available">Tersedia</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 grid grid-cols-2 gap-4">
                   <div className="col-span-full text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Pengaturan Harga Sewa</div>
                   <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Harga 3 Jam</label>
                    <input
                      type="text" inputMode="numeric" required value={formData.price_3h}
                      onChange={(e) => setFormData(p => ({ ...p, price_3h: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Harga 6 Jam</label>
                    <input
                      type="text" inputMode="numeric" required value={formData.price_6h}
                      onChange={(e) => setFormData(p => ({ ...p, price_6h: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Harga 12 Jam</label>
                    <input
                      type="text" inputMode="numeric" required value={formData.price_12h}
                      onChange={(e) => setFormData(p => ({ ...p, price_12h: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Harga 24 Jam</label>
                    <input
                      type="text" inputMode="numeric" required value={formData.price_24h}
                      onChange={(e) => setFormData(p => ({ ...p, price_24h: parseInt(e.target.value.replace(/\D/g, '')) || 0 }))}
                      className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Gambar Barang (Opsional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-slate-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100 cursor-pointer"
                  />
                  {formData.image_url && (
                    <div className="mt-2 text-xs text-slate-500">
                      Gambar terpilih {selectedFile ? '(Baru)' : '(Lama)'}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 text-sm font-medium transition-colors cursor-pointer">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors cursor-pointer">Simpan</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
