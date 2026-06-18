import { useNavigate } from 'react-router-dom';
import { ClipboardList, Fuel, ExternalLink, type LucideIcon } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RelDate } from '../../components/ui/RelDate';

interface OS {
  id: string;
  codigo: string;
  tipo: string;
  status: string;
  dataAbertura: string;
  responsavel?: { id: string; nome: string } | null;
}

interface Abastecimento {
  id: string;
  litros: number;
  posto: string;
  precoLitro: number;
  data: string;
  kmAtual: number;
  motorista?: { id: string; nome: string } | null;
}

interface Props {
  id: string;
  ordensServico: OS[];
  abastecimentos: Abastecimento[];
}

function SectionHeader({ icon: Icon, iconClass, title, count, onVerTodos, verTodosLabel = 'Ver todos →' }: {
  icon: LucideIcon; iconClass: string; title: string; count: number; onVerTodos: () => void; verTodosLabel?: string;
}) {
  return (
    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
      <Icon size={16} className={iconClass} />
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{count}</span>
      <button onClick={onVerTodos} className="ml-auto text-xs text-blue-600 hover:underline font-medium">{verTodosLabel}</button>
    </div>
  );
}

export function CaminhaoOsAbastecimentos({ id, ordensServico, abastecimentos }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* OS */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <SectionHeader icon={ClipboardList} iconClass="text-blue-500" title="Ordens de Serviço Recentes" count={ordensServico.length} onVerTodos={() => navigate(`/ordens-servico?caminhao=${id}`)} verTodosLabel="Ver todas →" />
        <div className="divide-y divide-gray-50">
          {ordensServico.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhuma OS registrada</p>
          ) : ordensServico.map((os) => (
            <div key={os.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition cursor-pointer group" onClick={() => navigate(`/ordens-servico/${os.id}`)}>
              <div>
                <CopyText text={os.codigo} className="text-sm font-mono font-bold text-blue-600" />
                <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  {os.responsavel ? (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${os.responsavel!.id}`); }} className="hover:text-blue-600 transition" title="Ver perfil do responsável">
                      {os.responsavel.nome}
                    </button>
                  ) : <span>—</span>}
                  <span>•</span>
                  <RelDate date={os.dataAbertura} />
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?caminhao=${id}&tipo=${os.tipo}`); }} className="hover:opacity-75 transition" title={`Filtrar OS por tipo: ${os.tipo}`}>
                  <StatusBadge status={os.tipo} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); navigate(`/ordens-servico?caminhao=${id}&status=${os.status}`); }} className="hover:opacity-75 transition" title={`Filtrar OS por status: ${os.status}`}>
                  <StatusBadge status={os.status} />
                </button>
                <ExternalLink size={13} className="text-gray-300 group-hover:text-blue-400 transition" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Abastecimentos */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <SectionHeader icon={Fuel} iconClass="text-green-500" title="Últimos Abastecimentos" count={abastecimentos.length} onVerTodos={() => navigate(`/abastecimento?caminhao=${id}`)} />
        <div className="divide-y divide-gray-50">
          {abastecimentos.length === 0 ? (
            <p className="px-5 py-6 text-sm text-gray-400 text-center">Nenhum abastecimento registrado</p>
          ) : abastecimentos.map((ab) => (
            <div key={ab.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition cursor-pointer" onClick={() => navigate(`/abastecimento?caminhao=${id}`)} title="Ver abastecimentos deste veículo">
              <div>
                <p className="text-sm font-semibold text-gray-800">{ab.litros} L — {ab.posto}</p>
                <span className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                  {ab.motorista ? (
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/funcionarios/${ab.motorista!.id}`); }} className="hover:text-blue-600 transition" title="Ver perfil do motorista">
                      {ab.motorista.nome}
                    </button>
                  ) : <span>—</span>}
                  <span>•</span>
                  <RelDate date={ab.data} />
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-green-700">R$ {(ab.litros * ab.precoLitro).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-gray-400">{ab.kmAtual.toLocaleString('pt-BR')} km</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
