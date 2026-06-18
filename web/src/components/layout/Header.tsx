// ══════════════════════════════════════════════════════════════
// HEADER — Barra superior com busca e notificações
// ══════════════════════════════════════════════════════════════

import { useLocation } from 'react-router-dom';
import { Menu, Search, Bell, LogOut } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';

// Mapa de rotas para títulos legíveis
const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/estoque': 'Controle de Estoque',
  '/frota': 'Gestão da Frota',
  '/ordens-servico': 'Ordens de Serviço',
  '/manutencao': 'Manutenção',
  '/financeiro': 'Financeiro',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
};

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const location = useLocation();
  const { logout } = useAuthStore();
  const title = pageTitles[location.pathname] || 'FleetMaster';

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between flex-shrink-0">
      {/* Lado esquerdo: toggle sidebar + título */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition"
        >
          <Menu size={20} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          <p className="text-xs text-gray-400 capitalize">{today}</p>
        </div>
      </div>

      {/* Lado direito: busca + notificações + logout */}
      <div className="flex items-center gap-3">
        {/* Campo de busca */}
        <div className="relative hidden md:block">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar no sistema..."
            className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-64 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-fleet-info/30 focus:border-fleet-info"
          />
        </div>

        {/* Botão de notificações */}
        <button className="relative p-2 rounded-xl hover:bg-gray-100 transition">
          <Bell size={20} className="text-gray-500" />
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-fleet-danger text-white text-[10px] font-bold flex items-center justify-center">
            3
          </span>
        </button>

        {/* Botão de logout */}
        <button
          onClick={logout}
          className="p-2 rounded-xl hover:bg-red-50 transition text-gray-400 hover:text-fleet-danger"
          title="Sair do sistema"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
