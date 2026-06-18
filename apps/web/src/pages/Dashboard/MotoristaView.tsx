import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Fuel, ClipboardList, Car, AlertTriangle, ArrowRight, CheckCircle2, XCircle, ClipboardCheck, Gauge, Plus } from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DetailPageSkeleton } from '../../components/ui/Skeleton';
import { RelDate } from '../../components/ui/RelDate';
import { useFuncionario, useAbastecimentos, useOrdensServico, useChecklistsCaminhao, useEficienciaCaminhao } from '../../hooks/useApi';
import { NovaVistoriaModal } from './NovaVistoriaModal';

interface MotoristaViewProps {
  funcionarioId: string;
}

export function MotoristaView({ funcionarioId }: MotoristaViewProps) {
  const navigate = useNavigate();
  const { data: funcionario, isLoading } = useFuncionario(funcionarioId);
  const caminhao = funcionario?.caminhoesMotorista?.[0] ?? null;
  const { data: abastecimentosData } = useAbastecimentos(
    1, caminhao?.id, undefined, undefined, undefined, undefined, funcionarioId,
  );
  // 'none' é sentinel: sem caminhão atribuído, caminhaoId undefined retornaria todas as OS da empresa
  const { data: ordensData } = useOrdensServico(
    1, 'aberta', undefined, 5, undefined, undefined, undefined, caminhao?.id ?? 'none',
  );
  const { data: checklists } = useChecklistsCaminhao(caminhao?.id);
  const { data: eficiencia } = useEficienciaCaminhao(caminhao?.id);

  const [modalVistoria, setModalVistoria] = useState<string | null>(null);

  const abastecimentos = abastecimentosData?.data ?? [];
  const ordens = ordensData?.data ?? [];
  const ultimoChecklist = checklists?.[0] ?? null;

  const cnhDias = funcionario?.cnhValidade
    ? Math.ceil((new Date(funcionario.cnhValidade).getTime() - Date.now()) / 86400000)
    : null;
  const cnhVencida = cnhDias !== null && cnhDias < 0;
  const cnhAlerta = cnhDias !== null && cnhDias <= 30;

  if (isLoading) {
    return <DetailPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Olá, {funcionario?.nome?.split(' ')[0] ?? 'Motorista'}!</h2>
        <p className="text-sm text-gray-400 mt-0.5">Sua visão personalizada</p>
      </div>

      {/* CNH alert */}
      {cnhAlerta && (
        <div className={`flex items-center gap-3 rounded-2xl px-5 py-3.5 border ${cnhVencida ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <AlertTriangle size={18} className={cnhVencida ? 'text-red-500' : 'text-amber-500'} />
          <p className={`text-sm font-medium ${cnhVencida ? 'text-red-700' : 'text-amber-700'}`}>
            {cnhVencida
              ? `Sua CNH venceu há ${Math.abs(cnhDias!)} dia${Math.abs(cnhDias!) !== 1 ? 's' : ''}. Regularize o quanto antes.`
              : `Sua CNH vence em ${cnhDias} dia${cnhDias !== 1 ? 's' : ''} (${new Date(funcionario!.cnhValidade!).toLocaleDateString('pt-BR')}).`
            }
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Meu caminhão */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Truck size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Meu Caminhão</h3>
            </div>
            {caminhao ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600 font-mono">{caminhao.codigo}</span>
                  <StatusBadge status={caminhao.status} />
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-600"><span className="text-gray-400">Modelo:</span> {caminhao.modelo}</p>
                  <p className="text-gray-600"><span className="text-gray-400">Placa:</span> {caminhao.placa}</p>
                </div>
                {eficiencia?.mediaKmL != null && (
                  <div className="flex items-center justify-between text-xs py-2 px-1 bg-amber-50 rounded-lg border border-amber-100">
                    <div className="flex items-center gap-1.5 text-amber-700">
                      <Gauge size={13} />
                      <span className="font-medium">Eficiência média</span>
                    </div>
                    <span className="font-bold text-amber-700">{eficiencia.mediaKmL.toFixed(2)} km/L</span>
                  </div>
                )}
                <button
                  onClick={() => navigate(`/frota/${caminhao.id}`)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-100 rounded-xl hover:bg-blue-50 transition"
                >
                  Ver detalhes <ArrowRight size={12} />
                </button>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-gray-400">
                <Truck size={28} className="mx-auto mb-2 opacity-30" />
                Nenhum caminhão atribuído
              </div>
            )}
          </div>

          {/* CNH info */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Car size={15} className="text-blue-500" />
              <h3 className="text-sm font-semibold text-gray-900">Minha CNH</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Categoria</span>
                <span className="font-medium text-gray-900">{funcionario?.cnhCategoria ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Validade</span>
                <span className={`font-medium ${cnhVencida ? 'text-red-600' : cnhAlerta ? 'text-amber-600' : 'text-gray-900'}`}>
                  {funcionario?.cnhValidade ? new Date(funcionario.cnhValidade).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
              {cnhDias !== null && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Situação</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cnhVencida ? 'bg-red-100 text-red-700' : cnhAlerta ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                    {cnhVencida ? 'Vencida' : cnhAlerta ? `${cnhDias}d restantes` : 'Em dia'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Último checklist */}
          {caminhao && (
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ClipboardCheck size={15} className="text-blue-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Última Vistoria</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setModalVistoria(caminhao.id)}
                    className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-lg transition"
                    title="Registrar nova vistoria"
                  >
                    <Plus size={11} /> Nova
                  </button>
                  <button
                    onClick={() => navigate(`/frota/${caminhao.id}`)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>
              </div>
              {ultimoChecklist ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${ultimoChecklist.aprovado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {ultimoChecklist.aprovado
                        ? <><CheckCircle2 size={11} /> Aprovado</>
                        : <><XCircle size={11} /> Reprovado</>
                      }
                    </span>
                    <span className="text-xs text-gray-400">
                      <RelDate date={ultimoChecklist.createdAt} />
                    </span>
                  </div>
                  {!ultimoChecklist.aprovado && (
                    <p className="text-xs text-red-600">
                      {ultimoChecklist.itens.filter((i) => !i.ok).length} item(s) reprovado(s)
                    </p>
                  )}
                  <p className="text-xs text-gray-400">KM: {ultimoChecklist.kmAtual.toLocaleString('pt-BR')}</p>
                </div>
              ) : (
                <div className="py-3 text-center text-xs text-gray-400">
                  <ClipboardCheck size={20} className="mx-auto mb-1 opacity-30" />
                  Nenhuma vistoria registrada
                </div>
              )}
            </div>
          )}
        </div>

        {/* OS e Abastecimentos */}
        <div className="lg:col-span-2 space-y-4">
          {/* OS abertas */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ClipboardList size={15} className="text-orange-500" />
                <h3 className="text-sm font-semibold text-gray-900">Ordens de Serviço Abertas</h3>
                {ordens.length > 0 && (
                  <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">{ordens.length}</span>
                )}
              </div>
              {caminhao && (
                <button onClick={() => navigate(`/ordens-servico?view=lista&caminhao=${caminhao.id}`)} className="text-xs text-blue-600 hover:underline">
                  Ver todas →
                </button>
              )}
            </div>
            {ordens.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <ClipboardList size={24} className="mx-auto mb-2 opacity-30" />
                Nenhuma OS aberta para seu caminhão
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {ordens.map((os) => (
                  <button
                    key={os.id}
                    className="w-full text-left px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/50 transition"
                    onClick={() => navigate(`/ordens-servico/${os.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-blue-600">{os.codigo}</span>
                        <StatusBadge status={os.status} />
                        <StatusBadge status={os.prioridade} />
                      </div>
                      <p className="text-sm text-gray-700 truncate">{os.descricao}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Previsão: {os.dataPrevisao ? <RelDate date={os.dataPrevisao} /> : '—'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Abastecimentos recentes */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fuel size={15} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-900">Meus Abastecimentos</h3>
              </div>
              <button onClick={() => navigate('/abastecimento')} className="text-xs text-blue-600 hover:underline">
                Ver todos →
              </button>
            </div>
            {abastecimentos.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <Fuel size={24} className="mx-auto mb-2 opacity-30" />
                Nenhum abastecimento registrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Data', 'Caminhão', 'Litros', 'Combustível', 'Posto'].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase px-5 py-2.5">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {abastecimentos.map((ab) => (
                      <tr key={ab.id} className="hover:bg-gray-50/50 transition">
                        <td className="px-5 py-2.5 text-xs text-gray-500">
                          <RelDate date={ab.data} />
                        </td>
                        <td className="px-5 py-2.5 text-xs font-mono text-blue-600">{ab.caminhao?.codigo ?? '—'}</td>
                        <td className="px-5 py-2.5 font-medium text-gray-900">{ab.litros.toFixed(1)} L</td>
                        <td className="px-5 py-2.5 text-xs text-gray-500 capitalize">{ab.combustivel.replace('_', ' ')}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-500 truncate max-w-[120px]">{ab.posto}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <NovaVistoriaModal
        caminhaoId={modalVistoria}
        funcionarioId={funcionarioId}
        kmAtualInicial={String(caminhao?.kmAtual ?? '')}
        onClose={() => setModalVistoria(null)}
      />
    </div>
  );
}
