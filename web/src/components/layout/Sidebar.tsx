// ══════════════════════════════════════════════════════════════
// SIDEBAR — Menu de navegação lateral
// ══════════════════════════════════════════════════════════════

import { NavLink } from 'react-router-dom';
import {
  Home, Package, Truck, ClipboardList, Wrench,
  DollarSign, BarChart3, Settings, Truck as Logo,
} from 'lucide-react';

// Define os itens do menu
const navItems = [
  { to: '/', icon: Home, label: 'Dashboard' },
  { to: '/estoque', icon: Package, label: 'Estoque' },
  { to: '/frota', icon: Truck, label: 'Frota' },
  { to: '/ordens-servico', icon: ClipboardList, label: 'Ordens de Serviço' },
  { to: '/manutencao', icon: Wrench, label: 'Manutenção' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { to: '/configuracoes', icon: Settings, label: 'Configurações' },
];

interface SidebarProps {
  isOpen: boolean;
}

export function Sidebar({ isOpen }: SidebarProps) {
  return (
    <aside
      className={`
        ${isOpen ? 'w-64' : 'w-[72px]'}
        bg-fleet-primary flex flex-col transition-all duration-300 flex-shrink-0
      `}
    >
      {/* Logo */}
      <div className={`
        ${isOpen ? 'px-5' : 'px-3'} py-6 border-b border-white/10
        flex items-center gap-3
      `}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fleet-accent to-amber-400 flex items-center justify-center flex-shrink-0">
          <Logo size={22} className="text-white" />
        </div>
        {isOpen && (
          <div>
            <div className="text-white font-bold text-lg tracking-tight">FleetMaster</div>
            <div className="text-white/40 text-[10px] font-medium uppercase tracking-widest">Pro v1.0</div>
          </div>
        )}
      </div>

      {/* Navegação */}
      <nav className="flex-1 py-4 px-2 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 rounded-xl transition-all duration-200
              ${isOpen ? 'px-3.5 py-2.5' : 'px-0 py-2.5 justify-center'}
              ${isActive
                ? 'bg-fleet-accent/15 text-fleet-accent'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }
            `}
          >
            <item.icon size={20} />
            {isOpen && (
              <span className="text-sm font-medium">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuário */}
      <div className={`
        ${isOpen ? 'px-5' : 'px-3'} py-4 border-t border-white/10
        flex items-center gap-3
      `}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fleet-info to-fleet-success flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">AM</span>
        </div>
        {isOpen && (
          <div className="overflow-hidden">
            <div className="text-white text-sm font-semibold truncate">Admin</div>
            <div className="text-white/40 text-xs">Gerente de Frota</div>
          </div>
        )}
      </div>
    </aside>
  );
}
