import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Truck, ClipboardList, Package, User, Wrench, X, Loader2, Building2 } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useSearch } from '../../hooks/useApi';
import { StatusBadge } from '../ui/StatusBadge';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q, 300);
  const { data, isFetching } = useSearch(debouncedQ);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQ('');
    }
  }, [open]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  function go(path: string) {
    navigate(path);
    onClose();
  }

  const hasResults = data && data.total > 0;
  const showEmpty = debouncedQ.length >= 2 && !isFetching && data?.total === 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Painel */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">

        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          {isFetching
            ? <Loader2 size={18} className="text-blue-500 animate-spin flex-shrink-0" />
            : <Search size={18} className="text-gray-400 flex-shrink-0" />
          }
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar caminhão, OS, material, funcionário, fornecedor..."
            className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          />
          {q && (
            <button onClick={() => setQ('')} className="text-gray-400 hover:text-gray-600 transition">
              <X size={16} />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-1 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono">
            Esc
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-[480px] overflow-y-auto">
          {!q && (
            <div className="px-4 py-8 text-center text-gray-400">
              <Search size={24} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Digite para buscar em toda a frota</p>
              <p className="text-xs mt-1 text-gray-300">Caminhões, OS, materiais, funcionários, equipamentos, fornecedores</p>
            </div>
          )}

          {showEmpty && (
            <div className="px-4 py-8 text-center text-gray-400">
              <p className="text-sm">Nenhum resultado para <span className="font-medium text-gray-600">"{debouncedQ}"</span></p>
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {data.caminhoes.length > 0 && (
                <Section icon={<Truck size={13} />} title="Caminhões">
                  {data.caminhoes.map((c) => (
                    <ResultRow key={c.id} onClick={() => go(`/frota/${c.id}`)}>
                      <span className="font-mono text-xs font-semibold text-blue-700">{c.codigo}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{c.modelo}</span>
                      <span className="text-xs text-gray-400 font-mono">{c.placa}</span>
                      <StatusBadge status={c.status} />
                    </ResultRow>
                  ))}
                </Section>
              )}

              {data.ordens.length > 0 && (
                <Section icon={<ClipboardList size={13} />} title="Ordens de Serviço">
                  {data.ordens.map((os) => (
                    <ResultRow key={os.id} onClick={() => go(`/ordens-servico/${os.id}`)}>
                      <span className="font-mono text-xs font-semibold text-blue-700">{os.codigo}</span>
                      <StatusBadge status={os.tipo} />
                      <span className="text-xs text-gray-400 font-mono flex-1 truncate">{os.caminhao?.placa ?? '—'}</span>
                      <StatusBadge status={os.status} />
                    </ResultRow>
                  ))}
                </Section>
              )}

              {data.materiais.length > 0 && (
                <Section icon={<Package size={13} />} title="Materiais">
                  {data.materiais.map((m) => (
                    <ResultRow key={m.id} onClick={() => go(`/estoque/${m.id}`)}>
                      <span className="font-mono text-xs font-semibold text-blue-700">{m.codigo}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{m.nome}</span>
                      <span className="text-xs text-gray-400">{m.unidadeMedida}</span>
                    </ResultRow>
                  ))}
                </Section>
              )}

              {data.funcionarios.length > 0 && (
                <Section icon={<User size={13} />} title="Funcionários">
                  {data.funcionarios.map((f) => (
                    <ResultRow key={f.id} onClick={() => go(`/funcionarios/${f.id}`)}>
                      <span className="text-sm text-gray-700 flex-1 truncate">{f.nome}</span>
                      <StatusBadge status={f.cargo} />
                    </ResultRow>
                  ))}
                </Section>
              )}

              {data.equipamentos.length > 0 && (
                <Section icon={<Wrench size={13} />} title="Equipamentos">
                  {data.equipamentos.map((e) => (
                    <ResultRow key={e.id} onClick={() => go(`/equipamentos/${e.id}`)}>
                      <span className="font-mono text-xs font-semibold text-blue-700">{e.codigo}</span>
                      <span className="text-sm text-gray-700 flex-1 truncate">{e.nome}</span>
                      <StatusBadge status={e.status} />
                    </ResultRow>
                  ))}
                </Section>
              )}

              {data.fornecedores.length > 0 && (
                <Section icon={<Building2 size={13} />} title="Fornecedores">
                  {data.fornecedores.map((f) => (
                    <ResultRow key={f.id} onClick={() => go('/configuracoes?tab=fornecedores')}>
                      <span className="text-sm text-gray-700 flex-1 truncate">{f.razaoSocial}</span>
                      <span className="text-xs text-gray-400 font-mono">{f.cnpj}</span>
                    </ResultRow>
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-gray-50 flex items-center gap-3 text-[11px] text-gray-400">
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Ctrl+K</kbd> para abrir</span>
          <span><kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd> para fechar</span>
          {hasResults && <span className="ml-auto">{data.total} resultado{data.total !== 1 ? 's' : ''}</span>}
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 px-4 py-1.5">
        <span className="text-gray-400">{icon}</span>
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</span>
      </div>
      {children}
    </div>
  );
}

function ResultRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-blue-50 transition text-left"
    >
      {children}
    </button>
  );
}
