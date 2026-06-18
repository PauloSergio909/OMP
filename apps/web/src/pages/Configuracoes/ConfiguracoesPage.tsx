import {
  User, Bell, Shield, Database, Palette,
  Building2, ChevronRight, Users, Truck, Package, ClipboardList,
} from 'lucide-react';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useUrlState } from '../../hooks/useUrlState';
import { SecaoPerfil } from './sections/SecaoPerfil';
import { SecaoNotificacoes } from './sections/SecaoNotificacoes';
import { SecaoSeguranca } from './sections/SecaoSeguranca';
import { SecaoUsuarios } from './sections/SecaoUsuarios';
import { SecaoFornecedores } from './sections/SecaoFornecedores';
import { SecaoCategorias } from './sections/SecaoCategorias';
import { SecaoSistema } from './sections/SecaoSistema';
import { SecaoAparencia } from './sections/SecaoAparencia';
import { SecaoEmpresa } from './sections/SecaoEmpresa';
import { SecaoAuditoria } from './sections/SecaoAuditoria';

const sections = [
  { id: 'perfil',       label: 'Perfil',          icon: User },
  { id: 'notificacoes', label: 'Notificações',     icon: Bell },
  { id: 'seguranca',    label: 'Segurança',        icon: Shield },
  { id: 'usuarios',     label: 'Usuários',         icon: Users },
  { id: 'fornecedores', label: 'Fornecedores',     icon: Truck },
  { id: 'categorias',   label: 'Categorias',       icon: Package },
  { id: 'sistema',      label: 'Sistema',          icon: Database },
  { id: 'aparencia',    label: 'Aparência',        icon: Palette },
  { id: 'empresa',      label: 'Empresa',          icon: Building2 },
  { id: 'auditoria',    label: 'Auditoria',        icon: ClipboardList },
];

export function ConfiguracoesPage() {
  usePageTitle('Configurações');
  const [active, setActive] = useUrlState('tab', 'perfil');

  return (
    <div className="flex flex-col md:flex-row gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <aside className="w-full md:w-56 md:flex-shrink-0">
        <nav className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex md:flex-col flex-wrap">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActive(s.id)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition border-b border-gray-50 last:border-0 md:w-full ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                {s.label}
                {isActive && <ChevronRight size={14} className="ml-auto text-blue-400" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 p-6">
        {active === 'perfil'       && <SecaoPerfil />}
        {active === 'notificacoes' && <SecaoNotificacoes />}
        {active === 'seguranca'    && <SecaoSeguranca />}
        {active === 'usuarios'     && <SecaoUsuarios />}
        {active === 'fornecedores' && <SecaoFornecedores />}
        {active === 'categorias'   && <SecaoCategorias />}
        {active === 'sistema'      && <SecaoSistema />}
        {active === 'aparencia'    && <SecaoAparencia />}
        {active === 'empresa'      && <SecaoEmpresa />}
        {active === 'auditoria'    && <SecaoAuditoria />}
      </div>
    </div>
  );
}
