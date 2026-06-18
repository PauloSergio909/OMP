// ══════════════════════════════════════════════════════════════
// VITE CONFIG — Configuração do servidor de desenvolvimento
// ══════════════════════════════════════════════════════════════
// Vite é o "motor" que roda o front-end em desenvolvimento.
// Ele serve os arquivos, faz hot-reload, e builda para produção.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // Permite importar com "@/" em vez de caminhos relativos longos
      // Ex: import { Button } from '@/components/ui/Button'
      // Em vez de: import { Button } from '../../../components/ui/Button'
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },

  server: {
    port: 5173,
    // Proxy: redireciona chamadas /api para o back-end
    // O front roda em :5173 e a API em :3000.
    // Sem proxy, o navegador bloquearia por CORS.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
