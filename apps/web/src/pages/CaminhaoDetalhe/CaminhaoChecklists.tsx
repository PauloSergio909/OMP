import { useState } from 'react';
import { ClipboardList, Plus, Printer } from 'lucide-react';
import { printDocument } from '../../utils/printDocument';
import { buildChecklistHtml } from '../../utils/printTemplates';
import { useChecklistsCaminhao } from '../../hooks/useApi';
import { NovoChecklistModal } from './NovoChecklistModal';

interface CaminhaoInfo {
  kmAtual: number;
  codigo: string;
  placa: string;
  modelo: string;
  motorista: { id: string; nome: string } | null;
}

interface Props {
  caminhaoId: string;
  caminhao: CaminhaoInfo;
}

export function CaminhaoChecklists({ caminhaoId, caminhao }: Props) {
  const { data: checklists = [] } = useChecklistsCaminhao(caminhaoId);
  const [modalChecklist, setModalChecklist] = useState(false);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-green-500" />
            <h3 className="text-sm font-semibold text-gray-900">Checklists de Vistoria</h3>
            {checklists.length > 0 && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                {checklists.length} registros
              </span>
            )}
          </div>
          <button
            onClick={() => setModalChecklist(true)}
            className="flex items-center gap-1.5 text-xs text-green-600 hover:text-green-700 font-medium"
          >
            <Plus size={13} /> Novo checklist
          </button>
        </div>

        {checklists.length === 0 ? (
          <div className="py-10 text-center text-sm text-gray-400">
            <ClipboardList size={28} className="mx-auto mb-2 opacity-30" />
            Nenhum checklist registrado
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {checklists.map((cl) => {
              const reprovados = cl.itens.filter((i) => !i.ok).length;
              return (
                <div key={cl.id} className="px-5 py-3.5 flex items-start gap-4">
                  <div className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 ${cl.aprovado ? 'bg-green-50' : 'bg-red-50'}`}>
                    {cl.aprovado
                      ? <span className="text-green-600 text-xs font-bold">✓</span>
                      : <span className="text-red-600 text-xs font-bold">✗</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cl.aprovado ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {cl.aprovado ? 'Aprovado' : 'Reprovado'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {cl.tipo === 'pre_viagem' ? 'Pré-viagem' : 'Pós-viagem'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {cl.motorista?.nome ?? '—'} · {cl.kmAtual.toLocaleString('pt-BR')} km
                      {reprovados > 0 && (
                        <span className="text-red-600 font-medium ml-1">· {reprovados} item(ns) com problema</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(cl.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <button
                      onClick={() => printDocument(
                        buildChecklistHtml(cl, { codigo: caminhao.codigo, placa: caminhao.placa, modelo: caminhao.modelo }),
                        `Checklist ${caminhao.codigo} — ${new Date(cl.createdAt).toLocaleDateString('pt-BR')}`,
                      )}
                      className="p-1 text-gray-300 hover:text-blue-500 transition rounded"
                      title="Imprimir / Salvar como PDF"
                      aria-label="Imprimir checklist"
                    >
                      <Printer size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NovoChecklistModal
        open={modalChecklist}
        onClose={() => setModalChecklist(false)}
        caminhaoId={caminhaoId}
        kmAtual={caminhao.kmAtual}
        motoristaPadrao={caminhao.motorista}
      />
    </>
  );
}
