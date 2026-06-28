import React, { useState, useEffect } from 'react';
import { CategoryService } from '../services/categoryService';
import { Category } from '../types';
import { Plus, Trash2, Folder, AlertCircle } from 'lucide-react';

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const data = await CategoryService.getAll();
      setCategories(data);
    } catch (err) {
      console.error(err);
      setError('Gagal memuat daftar kategori.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await CategoryService.create({ name: newCatName.trim() });
      setNewCatName('');
      setSuccess('Kategori baru berhasil ditambahkan.');
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Gagal menambahkan kategori.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus kategori "${name}"?`)) {
      setError('');
      setSuccess('');
      try {
        await CategoryService.delete(id);
        setSuccess(`Kategori "${name}" berhasil dihapus.`);
        fetchCategories();
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'Gagal menghapus kategori.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kelola Kategori</h1>
          <p className="text-sm text-slate-500">Tambahkan atau hapus kategori barang sewa.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Form Tambah Kategori */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-1">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Kategori Baru
          </h2>
          <form onSubmit={handleAddCategory} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Nama Kategori</label>
              <input
                type="text"
                required
                disabled={submitting}
                placeholder="Contoh: Drone, Kamera..."
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white placeholder:text-slate-400 transition-all outline-none"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border border-red-100 leading-tight">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg text-xs font-semibold flex items-start gap-2 border border-emerald-100 leading-tight">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !newCatName.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Kategori'}
            </button>
          </form>
        </div>

        {/* Tabel Daftar Kategori */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden md:col-span-2">
          <div className="p-5 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Folder className="w-5 h-5 text-slate-600" />
              Daftar Kategori Terdaftar
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Kategori</th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-10 text-center text-sm text-slate-500 font-medium">Memuat data...</td>
                  </tr>
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-10 text-center text-sm text-slate-500 font-medium">Belum ada kategori terdaftar.</td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">
                        {cat.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold text-xs border border-transparent hover:border-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
