import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, Edit, AlertCircle, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { DetailPageSkeleton } from '../../components/ui/Skeleton';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useMaterialDetalhe } from '../../hooks/useApi';
import { MaterialInfoCards } from './MaterialInfoCards';
import { MaterialMovimentacoesTabela } from './MaterialMovimentacoesTabela';
import { EditarMaterialModal } from './EditarMaterialModal';
import { RegistrarEntradaModal } from './RegistrarEntradaModal';
import { RegistrarSaidaModal } from './RegistrarSaidaModal';

export function MaterialDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalEdit, setModalEdit]       = useState(false);
  const [modalEntrada, setModalEntrada] = useState(false);
  const [modalSaida, setModalSaida]     = useState(false);

  const { data: material, isLoading, isError } = useMaterialDetalhe(id ?? '');
  usePageTitle(material ? `${material.codigo} — ${material.nome}` : 'Material');

  if (isLoading) return <DetailPageSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 font-medium">Erro ao carregar o material.</p>
        <p className="text-xs text-gray-400">Verifique a conexão e tente novamente.</p>
        <button onClick={() => navigate('/estoque')} className="mt-1 text-xs text-blue-600 hover:underline">
          Voltar para estoque
        </button>
      </div>
    );
  }

  if (!material) {
    return <div className="text-center py-20"><p className="text-gray-400">Material não encontrado.</p></div>;
  }

  const qtdAtual  = material.estoques?.[0]?.quantidade ?? 0;
  const isCritico = qtdAtual < material.estoqueMinimo;

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumb items={[
          { label: 'Estoque', href: '/estoque' },
          { label: `${material.codigo} — ${material.nome}` },
        ]} />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/estoque')} aria-label="Voltar para estoque" className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{material.nome}</h1>
                {!material.ativo && (
                  <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>
                )}
                {isCritico && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={11} /> Crítico
                  </span>
                )}
              </div>
              <CopyText text={material.codigo} className="text-xs font-mono text-blue-600 mt-0.5" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModalEntrada(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
              <ArrowDownToLine size={15} /> Entrada
            </button>
            <button onClick={() => setModalSaida(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition">
              <ArrowUpFromLine size={15} /> Saída
            </button>
            <button onClick={() => setModalEdit(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
              <Edit size={15} /> Editar
            </button>
          </div>
        </div>
      </div>

      {isCritico && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
          <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Estoque abaixo do mínimo</p>
            <p className="text-xs text-red-500 mt-0.5">
              Quantidade atual: <strong>{qtdAtual} {material.unidadeMedida}</strong> — mínimo: {material.estoqueMinimo}. Registre uma entrada ou faça um pedido de compra.
            </p>
          </div>
          <button onClick={() => setModalEntrada(true)} className="ml-auto shrink-0 text-xs font-medium text-red-700 bg-red-100 px-3 py-1.5 rounded-lg hover:bg-red-200 transition">
            Registrar entrada
          </button>
        </div>
      )}

      <MaterialInfoCards material={material} id={id!} />

      <MaterialMovimentacoesTabela
        material={material}
        qtdAtual={qtdAtual}
        onEntrada={() => setModalEntrada(true)}
        onSaida={() => setModalSaida(true)}
      />

      <EditarMaterialModal open={modalEdit} onClose={() => setModalEdit(false)} material={material} />
      <RegistrarEntradaModal
        open={modalEntrada} onClose={() => setModalEntrada(false)}
        materialId={id!} materialNome={material.nome}
        unidadeMedida={material.unidadeMedida} precoAtual={material.precoUnitario}
      />
      <RegistrarSaidaModal
        open={modalSaida} onClose={() => setModalSaida(false)}
        materialId={id!} materialNome={material.nome}
        unidadeMedida={material.unidadeMedida} qtdAtual={qtdAtual} isCritico={isCritico}
      />
    </div>
  );
}
