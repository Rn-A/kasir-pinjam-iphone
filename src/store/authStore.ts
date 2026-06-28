import { create } from 'zustand';
import { User } from '../types';
import { AuthService } from '../services/authService';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  login: async (email, pass) => {
    const user = await AuthService.login(email, pass);
    set({ user });
  },
  logout: async () => {
    await AuthService.logout();
    set({ user: null });
  },
  checkSession: async () => {
    set({ isLoading: true });
    try {
      const user = await AuthService.getSession();
      set({ user });
    } catch {
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },
  updateUser: (user) => {
    set({ user });
  }
}));

