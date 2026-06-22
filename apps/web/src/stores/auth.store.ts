import { create } from 'zustand';
import axios from 'axios';
import { api } from '../services/api';

interface AuthState {
  user: { id: string; nome: string; email: string; role: string; funcionarioId?: string | null } | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  updateUser: (partial: Partial<{ nome: string; email: string }>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, senha) => {
    const { data } = await api.post('/auth/login', { email, senha });

    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    set({
      user: data.data.user,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Falha silenciosa — o token expira naturalmente pelo TTL do Redis
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, isAuthenticated: false });
    }
  },

  updateUser: (partial) => set((state) => ({
    user: state.user ? { ...state.user, ...partial } : null,
  })),

  checkAuth: async () => {
    // Modo demo: login automático sem exibir a tela de login
    if (import.meta.env.VITE_DEMO_MODE === 'true') {
      const token = localStorage.getItem('accessToken');
      const payload = token
        ? (() => { try { return JSON.parse(atob(token.split('.')[1])); } catch { return null; } })()
        : null;
      if (payload && payload.exp * 1000 > Date.now()) {
        set({ user: { id: payload.id, email: payload.email, nome: payload.nome ?? '', role: payload.role, funcionarioId: payload.funcionarioId ?? null }, isAuthenticated: true, isLoading: false });
        return;
      }
      try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL ?? '/api'}/auth/login`, { email: 'admin@fleetmaster.com.br', senha: 'admin123' });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);
        set({ user: data.data.user, isAuthenticated: true, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
      return;
    }

    const token = localStorage.getItem('accessToken');

    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 > Date.now()) {
          set({
            user: { id: payload.id, email: payload.email, nome: payload.nome ?? '', role: payload.role, funcionarioId: payload.funcionarioId ?? null },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch {
        // token malformed — fall through to refresh attempt
      }
    }

    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL ?? '/api'}/auth/refresh`, { refreshToken });
        const newToken: string = data.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        set({
          user: { id: payload.id, email: payload.email, nome: payload.nome ?? '', role: payload.role, funcionarioId: payload.funcionarioId ?? null },
          isAuthenticated: true,
          isLoading: false,
        });
        return;
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }
    }

    set({ isLoading: false });
  },
}));
