import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { AuthService } from '../services/authService';
import { Smartphone, Lock, Mail, ArrowLeft, CheckCircle2, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login, user } = useAuthStore();
  const [email, setEmail] = useState('admin@pinjamiphone.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // States for Forgot Password OTP Wizard
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login gagal.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Send OTP to email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      await AuthService.forgotPassword(forgotEmail);
      setForgotSuccess('Kode OTP 6-Digit berhasil dikirim ke email Anda.');
      setForgotStep(2);
    } catch (err: any) {
      setForgotError(err.message || 'Gagal mengirim email reset password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 2: Verify OTP code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setForgotLoading(true);

    try {
      await AuthService.verifyOtp(forgotEmail, otpCode);
      setForgotSuccess('Verifikasi OTP berhasil. Silakan buat password baru Anda.');
      setForgotStep(3);
    } catch (err: any) {
      setForgotError(err.message || 'Kode OTP salah atau sudah kedaluwarsa.');
    } finally {
      setForgotLoading(false);
    }
  };

  // Step 3: Reset password with OTP verified
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (newPassword.length < 6) {
      setForgotError('Kata sandi baru harus minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setForgotLoading(true);
    try {
      await AuthService.resetPasswordOtp(forgotEmail, otpCode, newPassword);
      setForgotSuccess('Kata sandi berhasil disetel ulang. Silakan masuk.');
      
      // Reset all states and go back to login mode after a short delay
      setTimeout(() => {
        setMode('login');
        setForgotStep(1);
        setForgotEmail('');
        setOtpCode('');
        setNewPassword('');
        setConfirmPassword('');
        setForgotSuccess('');
        setForgotError('');
      }, 3000);
    } catch (err: any) {
      setForgotError(err.message || 'Gagal mereset kata sandi.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCancelForgot = () => {
    setMode('login');
    setForgotStep(1);
    setForgotEmail('');
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotError('');
    setForgotSuccess('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 shadow-xl overflow-hidden transition-all duration-300">
        
        {/* Header */}
        <div className="p-8 pb-6 border-b border-slate-200 flex flex-col items-center">
          <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
            <Smartphone className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pinjam iPhone</h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'login' 
              ? 'Sistem Manajemen Penyewaan' 
              : `Pemulihan Sandi - Langkah ${forgotStep} dari 3`}
          </p>
        </div>
        
        <div className="p-8 pt-6">
          {mode === 'login' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm border border-red-100 font-medium">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                  required
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setForgotStep(1);
                      setForgotEmail('');
                      setOtpCode('');
                      setForgotError('');
                      setForgotSuccess('');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    Lupa Password?
                  </button>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? (
                  <span>Memproses...</span>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Masuk Sistem
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-slate-400 mt-4 leading-relaxed">
                Demo bypass: Login otomatis dapat menggunakan akun di atas.
              </p>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Wizard Status Notifications */}
              {forgotError && (
                <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm border border-red-100 font-medium flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 font-bold">⚠️</span>
                  <span>{forgotError}</span>
                </div>
              )}
              {forgotSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-xl text-sm border border-emerald-100 font-medium flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 font-bold">✓</span>
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {/* STEP 1: Input Email */}
              {forgotStep === 1 && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Masukkan email terdaftar admin Anda. Kami akan mengirimkan 6 digit kode OTP pemulihan kata sandi ke kotak masuk Anda.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Terdaftar</label>
                    <div className="relative">
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                        placeholder="admin@email.com"
                        required
                        disabled={forgotLoading}
                      />
                      <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {forgotLoading ? 'Mengirim...' : 'Kirim Kode OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelForgot}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm cursor-pointer"
                      disabled={forgotLoading}
                    >
                      Batal
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: Verify OTP Code */}
              {forgotStep === 2 && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Periksa kotak masuk email <strong>{forgotEmail}</strong> Anda. Masukkan 6 digit kode OTP rahasia di bawah ini.
                  </p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kode OTP 6 Digit</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-center text-lg font-bold tracking-[8px] placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={forgotLoading}
                      />
                      <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={forgotLoading || otpCode.length !== 6}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {forgotLoading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setForgotStep(1)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl transition-all duration-200 text-xs cursor-pointer"
                        disabled={forgotLoading}
                      >
                        Kembali
                      </button>
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200/80 font-semibold py-2 rounded-xl transition-all duration-200 text-xs cursor-pointer"
                        disabled={forgotLoading}
                      >
                        Kirim Ulang OTP
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {/* STEP 3: Reset Password */}
              {forgotStep === 3 && (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Satu langkah lagi! Kode OTP telah berhasil diverifikasi. Harap masukkan kata sandi baru untuk akun Anda.
                  </p>
                  
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Kata Sandi Baru</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                          placeholder="Minimal 6 karakter"
                          required
                          disabled={forgotLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          disabled={forgotLoading}
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Konfirmasi Kata Sandi</label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-4 pr-11 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all duration-200 text-sm font-medium"
                          placeholder="Masukkan ulang kata sandi baru"
                          required
                          disabled={forgotLoading}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={forgotLoading || !newPassword || !confirmPassword}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-blue-500/10 cursor-pointer disabled:bg-slate-200 disabled:text-slate-400"
                    >
                      {forgotLoading ? 'Menyimpan...' : 'Setel Ulang Kata Sandi'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelForgot}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 rounded-xl transition-all duration-200 text-sm cursor-pointer"
                      disabled={forgotLoading}
                    >
                      Batal ke Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


