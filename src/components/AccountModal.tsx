import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { AuthService } from '../services/authService';
import { X, Mail, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'email' | 'password'>('email');

  // Form Email States
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Form Password States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  if (!isOpen) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    if (newEmail === user?.email) {
      setEmailError('Email baru harus berbeda dengan email saat ini.');
      return;
    }

    setEmailLoading(true);
    try {
      const updatedUser = await AuthService.updateAccount({
        current_password: emailConfirmPassword,
        new_email: newEmail,
      });
      updateUser(updatedUser);
      setEmailSuccess('Email berhasil diperbarui.');
      setEmailConfirmPassword('');
    } catch (err: any) {
      setEmailError(err.message || 'Gagal memperbarui email.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('Kata sandi baru harus minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setPasswordLoading(true);
    try {
      const updatedUser = await AuthService.updateAccount({
        current_password: currentPassword,
        new_password: newPassword,
      });
      updateUser(updatedUser);
      setPasswordSuccess('Kata sandi berhasil diperbarui.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err.message || 'Gagal memperbarui kata sandi.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleClose = () => {
    // Reset messages when closing
    setEmailError('');
    setEmailSuccess('');
    setPasswordError('');
    setPasswordSuccess('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Modal Container */}
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl relative z-10 overflow-hidden transform transition-all duration-300">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Kelola Akun</h3>
            <p className="text-xs text-slate-500 mt-0.5">Ubah email login atau kata sandi admin Anda</p>
          </div>
          <button 
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Nav */}
        <div className="flex border-b border-slate-100 px-6">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'email' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Ubah Email
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`flex-1 py-3 text-sm font-semibold border-b-2 text-center transition-colors cursor-pointer ${
              activeTab === 'password' 
                ? 'border-blue-600 text-blue-600' 
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            Ubah Password
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {emailError && (
                <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-xl text-sm border border-emerald-100 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{emailSuccess}</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Saat Ini</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={user?.email || ''}
                      disabled
                      className="w-full pl-4 pr-11 py-2.5 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl text-sm font-medium outline-none cursor-not-allowed"
                    />
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Baru</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                      placeholder="Masukkan email baru"
                      required
                      disabled={emailLoading}
                    />
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-50">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password Konfirmasi</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={emailConfirmPassword}
                      onChange={(e) => setEmailConfirmPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                      placeholder="Masukkan password Anda saat ini"
                      required
                      disabled={emailLoading}
                    />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  disabled={emailLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={emailLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {emailLoading ? 'Menyimpan...' : 'Simpan Email'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {passwordError && (
                <div className="bg-red-50 text-red-700 p-3.5 rounded-xl text-sm border border-red-100 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-xl text-sm border border-emerald-100 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password Saat Ini</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                      placeholder="Masukkan password saat ini"
                      required
                      disabled={passwordLoading}
                    />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  </div>
                </div>

                <div className="pt-1.5 border-t border-slate-50">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password Baru</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                      placeholder="Minimal 6 karakter"
                      required
                      disabled={passwordLoading}
                    />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Konfirmasi Password Baru</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                      placeholder="Masukkan ulang password baru"
                      required
                      disabled={passwordLoading}
                    />
                    <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                  disabled={passwordLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {passwordLoading ? 'Menyimpan...' : 'Simpan Password'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
