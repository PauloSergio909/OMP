import { NavLink } from 'react-router-dom';
import {
  Home, Package, Truck, ClipboardList, Wrench,
  BarChart3, Settings, Truck as Logo, Users, Fuel, X, ShoppingCart, Calendar,
} from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { useEstoqueAlertas, useManutencaoVencendo, useComprasKPIs, useOrdensServicoKPIs, useCnhVencendo, usePneusKPIs, useProximosManutencaoKm, useEquipamentosRevisoesVencendo } from '../../hooks/useApi';

const navGroups = [
  {
    label: 'Operações',
    items: [
      { to: '/', icon: Home, label: 'Dashboard' },
      { to: '/frota', icon: Truck, label: 'Frota' },
      { to: '/agenda', icon: Calendar, label: 'Agenda' },
      { to: '/ordens-servico', icon: ClipboardList, label: 'Ordens de Serviço' },
      { to: '/abastecimento', icon: Fuel, label: 'Abastecimento' },
    ],
  },
  {
    label: 'Almoxarifado',
    items: [
      { to: '/estoque', icon: Package, label: 'Estoque' },
      { to: '/compras', icon: ShoppingCart, label: 'Ordens de Compra' },
      { to: '/equipamentos', icon: Wrench, label: 'Equipamentos' },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { to: '/funcionarios', icon: Users, label: 'Funcionários' },
      { to: '/relatorios', icon: BarChart3, label: 'Relatórios' },
      { to: '/configuracoes', icon: Settings, label: 'Configurações' },
    ],
  },
];

function getInitials(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

const roleLabels: Record<string, string> = {
  admin: 'Administrador',
  gerente: 'Gerente',
  mecanico: 'Mecânico',
  almoxarife: 'Almoxarife',
  visualizador: 'Visualizador',
};

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user } = useAuthStore();
  const { data: alertasEstoque = [] } = useEstoqueAlertas();
  const { data: manutencaoVencendo = [] } = useManutencaoVencendo();
  const { data: comprasKPIs } = useComprasKPIs();
  const { data: osKPIs } = useOrdensServicoKPIs();
  const { data: cnhVencendo = [] } = useCnhVencendo();
  const { data: pneusKPIs } = usePneusKPIs();
  const { data: proximosKm = [] } = useProximosManutencaoKm(1000);
  const { data: revisoesEquip = [] } = useEquipamentosRevisoesVencendo();

  const badgeMap: Record<string, number> = {
    '/estoque':        alertasEstoque.length,
    '/frota':          manutencaoVencendo.length + proximosKm.length,
    '/compras':        comprasKPIs?.atrasadas || comprasKPIs?.pendentes || 0,
    '/ordens-servico': osKPIs?.atrasadas || osKPIs?.urgentes || 0,
    '/funcionarios':   cnhVencendo.length,
    '/relatorios':     pneusKPIs?.alertas80 ?? 0,
    '/equipamentos':   revisoesEquip.length,
  };

  return (
    <aside
      className={`
        ${isOpen ? 'w-64' : 'w-[72px]'}
        bg-fleet-primary flex flex-col transition-all duration-300 flex-shrink-0 h-full
      `}
    >
      <div className={`${isOpen ? 'px-5' : 'px-3'} py-5 border-b border-white/10 flex items-center gap-3`}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fleet-accent to-amber-400 flex items-center justify-center flex-shrink-0">
          <Logo size={22} className="text-white" />
        </div>
        {isOpen && (
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold text-lg tracking-tight">FleetMaster</div>
            <div className="text-white/40 text-[10px] font-medium uppercase tracking-widest">Pro v1.0</div>
          </div>
        )}
        {isOpen && onClose && (
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="lg:hidden p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition flex-shrink-0"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            {isOpen && (
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 px-3.5 mb-1">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const badge = badgeMap[item.to] ?? 0;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `
                      relative flex items-center gap-3 rounded-xl transition-all duration-200
                      ${isOpen ? 'px-3.5 py-2.5' : 'px-0 py-2.5 justify-center'}
                      ${isActive
                        ? 'bg-fleet-accent/15 text-fleet-accent'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                      }
                    `}
                  >
                    <div className="relative flex-shrink-0">
                      <item.icon size={20} />
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-bold leading-none">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </div>
                    {isOpen && (
                      <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                    )}
                    {isOpen && badge > 0 && (
                      <span className="ml-auto flex-shrink-0 min-w-[20px] h-5 px-1 flex items-center justify-center rounded-full bg-red-500/20 text-red-300 text-[10px] font-bold">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`${isOpen ? 'px-4' : 'px-2.5'} py-4 border-t border-white/10 flex items-center gap-3`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-fleet-info to-fleet-success flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-bold">
            {user?.nome ? getInitials(user.nome) : '?'}
          </span>
        </div>
        {isOpen && (
          <div className="overflow-hidden flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">{user?.nome ?? '—'}</div>
            <div className="text-white/40 text-xs truncate">{roleLabels[user?.role ?? ''] ?? user?.role}</div>
          </div>
        )}
      </div>
    </aside>
  );
}
