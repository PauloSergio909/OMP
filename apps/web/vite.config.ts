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
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        // Separa bibliotecas pesadas em chunks próprios para melhor caching
        manualChunks: {
          'vendor-react':   ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':   ['@tanstack/react-query', 'axios', 'zustand'],
          'vendor-charts':  ['recharts'],
          'vendor-dnd':     ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          'vendor-ui':      ['lucide-react', 'react-hot-toast'],
        },
      },
    },
  },
});
