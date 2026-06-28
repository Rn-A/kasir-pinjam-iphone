import { User } from '../types';
import { api } from '../lib/api';

export const AuthService = {
  async getSession(): Promise<User | null> {
    const mockUser = localStorage.getItem('mock_user');
    if (!mockUser) return null;

    try {
      // Validate session with the backend
      const user = await api.get<User>('/auth/session');
      return user;
    } catch (err) {
      console.error('Session validation failed:', err);
      localStorage.removeItem('mock_user');
      return null;
    }
  },

  async login(email: string, pass: string): Promise<User> {
    try {
      const user = await api.post<User>('/auth/login', { email, password: pass });
      // Keep in localStorage for fast UI state restoration and session header
      localStorage.setItem('mock_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      throw new Error(err.message || 'Email atau password salah');
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('mock_user');
  },

  async updateAccount(data: {
    current_password: string;
    new_email?: string;
    new_password?: string;
  }): Promise<User> {
    try {
      const user = await api.put<User>('/auth/account', data);
      localStorage.setItem('mock_user', JSON.stringify(user));
      return user;
    } catch (err: any) {
      throw new Error(err.message || 'Gagal memperbarui akun.');
    }
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      await api.post<any>('/auth/forgot-password', { email });
    } catch (err: any) {
      throw new Error(err.message || 'Gagal mengirim email reset password.');
    }
  },

  async verifyOtp(email: string, otp: string): Promise<void> {
    try {
      await api.post<any>('/auth/verify-otp', { email, otp });
    } catch (err: any) {
      throw new Error(err.message || 'Kode OTP salah atau sudah kedaluwarsa.');
    }
  },

  async resetPasswordOtp(email: string, otp: string, pass: string): Promise<void> {
    try {
      await api.post<any>('/auth/reset-password-otp', { email, otp, password: pass });
    } catch (err: any) {
      throw new Error(err.message || 'Gagal mereset password.');
    }
  }
};

