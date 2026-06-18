// ══════════════════════════════════════════════════════════════
// MAIN.TSX — Ponto de entrada do React
// ══════════════════════════════════════════════════════════════
// Este arquivo "monta" a aplicação React dentro da div#root do index.html.
// Aqui configuramos os providers globais:
// - BrowserRouter: habilita navegação por URLs (/dashboard, /estoque)
// - QueryClientProvider: habilita cache de dados da API (TanStack Query)

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/globals.css';

// Configura o TanStack Query (cache de dados da API)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // Dados ficam "frescos" por 5 minutos
      retry: 1,                    // Se falhar, tenta mais 1 vez
      refetchOnWindowFocus: false, // Não recarrega ao voltar para a aba
    },
  },
});

// Monta a aplicação
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
);
