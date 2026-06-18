// ══════════════════════════════════════════════════════════════
// APP.TSX — Componente raiz da aplicação
// ══════════════════════════════════════════════════════════════
// Define a estrutura de rotas e o layout principal.
// Rotas protegidas só aparecem se o usuário estiver logado.

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/auth.store';

// Layout
import { MainLayout } from './components/layout/MainLayout';

// Páginas
import { LoginPage } from './pages/Login/LoginPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { EstoquePage } from './pages/Estoque/EstoquePage';
import { FrotaPage } from './pages/Frota/FrotaPage';
import { OrdensServicoPage } from './pages/OrdensServico/OrdensServicoPage';

export default function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  // Ao montar o app, verifica se já existe um token salvo
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Enquanto verifica auth, mostra loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-fleet-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Carregando FleetMaster...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Toaster: mostra notificações toast (sucesso, erro, etc) */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '10px', fontFamily: 'DM Sans' },
        }}
      />

      <Routes>
        {/* ─── ROTA PÚBLICA ─── */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
        />

        {/* ─── ROTAS PROTEGIDAS ─── */}
        {/* MainLayout inclui sidebar + header */}
        {/* Todas as páginas internas ficam dentro dele */}
        <Route
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/estoque" element={<EstoquePage />} />
          <Route path="/frota" element={<FrotaPage />} />
          <Route path="/ordens-servico" element={<OrdensServicoPage />} />
          {/* TODO: adicionar mais rotas conforme módulos forem implementados */}
        </Route>

        {/* Qualquer rota não encontrada → redireciona */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}
