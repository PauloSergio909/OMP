// ══════════════════════════════════════════════════════════════
// API SERVICE — Cliente HTTP (Axios)
// ══════════════════════════════════════════════════════════════
//
// Centraliza TODAS as chamadas HTTP para a API.
// Configura:
// 1. URL base (não precisa repetir "http://localhost:3000" em todo lugar)
// 2. Interceptor de request: adiciona o token JWT em TODA requisição
// 3. Interceptor de response: se o token expirou, tenta renovar automaticamente

import axios from 'axios';

// Cria uma instância do Axios com configurações padrão
export const api = axios.create({
  baseURL: '/api', // Vite proxy redireciona para http://localhost:3000/api
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── INTERCEPTOR DE REQUEST ──────────────────────────────────
// Roda ANTES de toda requisição. Adiciona o token JWT no header.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');

  if (token) {
    // O padrão é: Authorization: Bearer <token>
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// ─── INTERCEPTOR DE RESPONSE ─────────────────────────────────
// Roda DEPOIS de receber a resposta. Trata erros globais.
api.interceptors.response.use(
  // Se deu certo, retorna normalmente
  (response) => response,

  // Se deu erro...
  async (error) => {
    const originalRequest = error.config;

    // Se o erro é 401 (token expirado) e NÃO é uma tentativa de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Marca para não entrar em loop infinito

      try {
        const refreshToken = localStorage.getItem('refreshToken');

        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // Tenta renovar o token
        const { data } = await axios.post('/api/auth/refresh', { refreshToken });

        // Salva o novo token
        localStorage.setItem('accessToken', data.data.accessToken);

        // Refaz a requisição original com o novo token
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(originalRequest);
      } catch {
        // Refresh falhou → desloga o usuário
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);
