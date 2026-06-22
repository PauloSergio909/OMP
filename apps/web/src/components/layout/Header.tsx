import { useLocation } from 'react-router-dom';
import { Menu, LogOut, Search } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store';
import { AlertasDropdown } from './AlertasDropdown';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/estoque': 'Controle de Estoque',
  '/frota': 'Gestão da Frota',
  '/ordens-servico': 'Ordens de Serviço',
  '/funcionarios': 'Funcionários',
  '/abastecimento': 'Abastecimento',
  '/equipamentos': 'Equipamentos e Ferramentas',
  '/compras': 'Ordens de Compra',
  '/relatorios': 'Relatórios',
  '/agenda': 'Agenda de Manutenções',
  '/configuracoes': 'Configurações',
};

function resolveTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/frota/')) return 'Detalhes do Caminhão';
  if (pathname.startsWith('/ordens-servico/')) return 'Detalhes da OS';
  if (pathname.startsWith('/funcionarios/')) return 'Detalhes do Funcionário';
  if (pathname.startsWith('/compras/')) return 'Detalhes da OC';
  if (pathname.startsWith('/estoque/')) return 'Detalhes do Material';
  if (pathname.startsWith('/equipamentos/')) return 'Detalhes do Equipamento';
  return 'Controle OMP';
}

function getInitials(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('');
}

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
}

export function Header({ onToggleSidebar, onOpenSearch }: HeaderProps) {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const title = resolveTitle(location.pathname);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-6 h-16 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label="Alternar menu lateral"
          className="p-1.5 rounded-lg hover:bg-gray-100 transition"
        >
          <Menu size={20} className="text-gray-500" />
        </button>
        <div>
          <h1 className="text-base md:text-lg font-bold text-gray-900 leading-tight">{title}</h1>
          <p className="text-xs text-gray-400 capitalize hidden md:block">{today}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onOpenSearch}
          aria-label="Busca global (Ctrl+K)"
          title="Busca global (Ctrl+K)"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition text-xs"
        >
          <Search size={15} />
          <span className="hidden md:inline text-gray-400">Buscar...</span>
          <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] text-gray-300 font-mono">
            Ctrl K
          </kbd>
        </button>

        <AlertasDropdown />

        <div className="flex items-center gap-2.5 pl-2 border-l border-gray-200 ml-1">
          <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.nome ? getInitials(user.nome) : '?'}
          </div>
          <div className="hidden md:block">
            <p className="text-xs font-semibold text-gray-800 leading-tight">{user?.nome || '—'}</p>
            <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Sair do sistema"
            className="p-1.5 rounded-lg hover:bg-red-50 transition text-gray-400 hover:text-red-500"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
