import { lazy, Suspense, useEffect, type ComponentType } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/auth.store';
import { MainLayout } from './components/layout/MainLayout';
import { ErrorBoundary, PageErrorFallback } from './components/ui/ErrorBoundary';
import { ScrollToTop } from './components/layout/ScrollToTop';

// Página de login carregada de forma síncrona — é a primeira rota exibida
import { LoginPage } from './pages/Login/LoginPage';

// Todas as outras páginas carregadas sob demanda (code splitting por rota)
const DashboardPage           = lazy(() => import('./pages/Dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const EstoquePage             = lazy(() => import('./pages/Estoque/EstoquePage').then(m => ({ default: m.EstoquePage })));
const FrotaPage               = lazy(() => import('./pages/Frota/FrotaPage').then(m => ({ default: m.FrotaPage })));
const CaminhaoDetalhePage     = lazy(() => import('./pages/CaminhaoDetalhe/CaminhaoDetalhePage').then(m => ({ default: m.CaminhaoDetalhePage })));
const OrdensServicoPage       = lazy(() => import('./pages/OrdensServico/OrdensServicoPage').then(m => ({ default: m.OrdensServicoPage })));
const OrdemServicoDetalhePage = lazy(() => import('./pages/OrdemServicoDetalhe/OrdemServicoDetalhePage').then(m => ({ default: m.OrdemServicoDetalhePage })));
const FuncionariosPage        = lazy(() => import('./pages/Funcionarios/FuncionariosPage').then(m => ({ default: m.FuncionariosPage })));
const FuncionarioDetalhePage  = lazy(() => import('./pages/FuncionarioDetalhe/FuncionarioDetalhePage').then(m => ({ default: m.FuncionarioDetalhePage })));
const AbastecimentoPage       = lazy(() => import('./pages/Abastecimento/AbastecimentoPage').then(m => ({ default: m.AbastecimentoPage })));
const EquipamentosPage        = lazy(() => import('./pages/Equipamentos/EquipamentosPage').then(m => ({ default: m.EquipamentosPage })));
const EquipamentoDetalhePage  = lazy(() => import('./pages/EquipamentoDetalhe/EquipamentoDetalhePage').then(m => ({ default: m.EquipamentoDetalhePage })));
const MaterialDetalhePage     = lazy(() => import('./pages/MaterialDetalhe/MaterialDetalhePage').then(m => ({ default: m.MaterialDetalhePage })));
const ComprasPage             = lazy(() => import('./pages/Compras/ComprasPage').then(m => ({ default: m.ComprasPage })));
const CompraDetalhePage       = lazy(() => import('./pages/CompraDetalhe/CompraDetalhePage').then(m => ({ default: m.CompraDetalhePage })));
const RelatoriosPage          = lazy(() => import('./pages/Relatorios/RelatoriosPage').then(m => ({ default: m.RelatoriosPage })));
const AgendaPage              = lazy(() => import('./pages/Agenda/AgendaPage').then(m => ({ default: m.AgendaPage })));
const ConfiguracoesPage       = lazy(() => import('./pages/Configuracoes/ConfiguracoesPage').then(m => ({ default: m.ConfiguracoesPage })));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function page(Page: ComponentType) {
  return (
    <ErrorBoundary fallback={(err, reset) => <PageErrorFallback error={err} reset={reset} />}>
      <Page />
    </ErrorBoundary>
  );
}

export default function App() {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-fleet-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Carregando Controle OMP...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '10px', fontFamily: 'DM Sans' },
        }}
      />

      <Suspense fallback={<PageLoader />}>
        <ScrollToTop />
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
          />

          <Route
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}
          >
            <Route path="/"                    element={page(DashboardPage)} />
            <Route path="/estoque"             element={page(EstoquePage)} />
            <Route path="/estoque/:id"         element={page(MaterialDetalhePage)} />
            <Route path="/frota"               element={page(FrotaPage)} />
            <Route path="/frota/:id"           element={page(CaminhaoDetalhePage)} />
            <Route path="/ordens-servico"      element={page(OrdensServicoPage)} />
            <Route path="/ordens-servico/:id"  element={page(OrdemServicoDetalhePage)} />
            <Route path="/funcionarios"        element={page(FuncionariosPage)} />
            <Route path="/funcionarios/:id"    element={page(FuncionarioDetalhePage)} />
            <Route path="/abastecimento"       element={page(AbastecimentoPage)} />
            <Route path="/equipamentos"        element={page(EquipamentosPage)} />
            <Route path="/equipamentos/:id"    element={page(EquipamentoDetalhePage)} />
            <Route path="/compras"             element={page(ComprasPage)} />
            <Route path="/compras/:id"         element={page(CompraDetalhePage)} />
            <Route path="/relatorios"          element={page(RelatoriosPage)} />
            <Route path="/agenda"              element={page(AgendaPage)} />
            <Route path="/configuracoes"       element={page(ConfiguracoesPage)} />
          </Route>

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
