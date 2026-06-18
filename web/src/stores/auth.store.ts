// ══════════════════════════════════════════════════════════════
// AUTH STORE — Estado global de autenticação (Zustand)
// ══════════════════════════════════════════════════════════════
//
// ZUSTAND vs REDUX:
// Redux: 1 store + actions + reducers + dispatch + selectors = muito boilerplate
// Zustand: 1 hook com estado + funções. Pronto. Sem Provider, sem boilerplate.
//
// COMO USAR EM QUALQUER COMPONENTE:
// const { user, isAuthenticated, login, logout } = useAuthStore();

import { create } from 'zustand';
import { api } from '../services/api';

// Define o formato do estado
interface AuthState {
  user: { id: string; nome: string; email: string; role: string } | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Ações (funções que modificam o estado)
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

// Cria o store
export const useAuthStore = create<AuthState>((set) => ({
  // Estado inicial
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // ─── LOGIN ─────────────────────────────────────────────────
  login: async (email, senha) => {
    // Chama a API de login
    const { data } = await api.post('/auth/login', { email, senha });

    // Salva os tokens no localStorage
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);

    // Atualiza o estado global
    set({
      user: data.data.user,
      isAuthenticated: true,
    });
  },

  // ─── LOGOUT ────────────────────────────────────────────────
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, isAuthenticated: false });
  },

  // ─── CHECK AUTH ────────────────────────────────────────────
  // Verifica se o usuário já está logado (ao abrir o app)
  checkAuth: () => {
    const token = localStorage.getItem('accessToken');

    if (token) {
      try {
        // Decodifica o JWT para extrair os dados do usuário
        // JWT tem 3 partes separadas por ".": header.payload.signature
        // O payload (parte do meio) contém os dados
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Verifica se não expirou
        if (payload.exp * 1000 > Date.now()) {
          set({
            user: { id: payload.id, email: payload.email, nome: '', role: payload.role },
            isAuthenticated: true,
            isLoading: false,
          });
          return;
        }
      } catch {
        // Token inválido
      }
    }

    set({ isLoading: false });
  },
}));
