// ══════════════════════════════════════════════════════════════
// MAIN LAYOUT — Estrutura visual de todas as páginas internas
// ══════════════════════════════════════════════════════════════
// Sidebar (esquerda) + Header (topo) + Conteúdo (centro)
// O <Outlet /> do React Router renderiza a página ativa.

import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar fixa à esquerda */}
      <Sidebar isOpen={sidebarOpen} />

      {/* Área principal: header + conteúdo */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        {/* Conteúdo da página (scroll aqui dentro) */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* Outlet renderiza o componente da rota ativa */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
