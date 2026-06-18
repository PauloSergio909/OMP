import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Printer, ShoppingCart, Building2, Calendar,
  DollarSign, AlertCircle, Edit, Plus, Trash2,
} from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import { DetailPageSkeleton } from '../../components/ui/Skeleton';
import { Breadcrumb } from '../../components/ui/Breadcrumb';
import { usePageTitle } from '../../hooks/usePageTitle';
import { RelDate } from '../../components/ui/RelDate';
import { useCompraDetalhe, useRemoverItemOC } from '../../hooks/useApi';
import { printDocument } from '../../utils/printDocument';
import { buildOCHtml } from '../../utils/printTemplates';
import { statusColors, statusLabels, statusIcons } from './compra-detalhe.constants';
import { AdicionarItemOCModal } from './AdicionarItemOCModal';
import { EditarOCModal } from './EditarOCModal';
import { AtualizarStatusOCModal } from '../Compras/AtualizarStatusOCModal';

export function CompraDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [modalItem, setModalItem] = useState(false);
  const [ocEditar, setOcEditar] = useState<{ id: string; codigo: string; dataEntrega?: string | null; observacoes?: string | null } | null>(null);
  const [ocStatus, setOcStatus] = useState<{ id: string; status: string; codigo: string } | null>(null);
  const [confirmRemover, setConfirmRemover] = useState<string | null>(null);

  const { data: oc, isLoading, isError } = useCompraDetalhe(id ?? '');
  const removerItem = useRemoverItemOC();
  usePageTitle(oc?.codigo ?? '');

  if (isLoading) return <DetailPageSkeleton />;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-2">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-gray-500 font-medium">Erro ao carregar a ordem de compra.</p>
        <p className="text-xs text-gray-400">Verifique a conexão e tente novamente.</p>
        <button onClick={() => navigate('/compras')} className="mt-1 text-xs text-blue-600 hover:underline">Voltar para compras</button>
      </div>
    );
  }

  if (!oc) {
    return <div className="text-center py-20"><p className="text-gray-400">Ordem de compra não encontrada.</p></div>;
  }

  const isFinal = oc.status === 'recebida' || oc.status === 'cancelada';
  const isAtrasada = !isFinal && oc.dataEntrega && new Date(oc.dataEntrega) < new Date();
  const diasAtraso = isAtrasada
    ? Math.ceil((Date.now() - new Date(oc.dataEntrega).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const StatusIcon = statusIcons[oc.status] ?? statusIcons.pendente;
  const itens = oc.itens ?? [];
  const valorTotal: number = oc.valorTotal ?? 0;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <Breadcrumb items={[{ label: 'Compras', href: '/compras' }, { label: oc.codigo }]} />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/compras')} aria-label="Voltar para compras" className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-xl font-bold text-gray-900"><CopyText text={oc.codigo} className="font-mono" /></h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => oc && printDocument(buildOCHtml(oc), `OC ${oc.codigo} — FleetMaster`)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
              <Printer size={15} /> Imprimir / PDF
            </button>
            {oc.status === 'pendente' && (
              <button onClick={() => setOcEditar({ id: oc.id, codigo: oc.codigo, dataEntrega: oc.dataEntrega, observacoes: oc.observacoes })} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
                <Edit size={15} /> Editar OC
              </button>
            )}
            {!isFinal && (
              <button onClick={() => setOcStatus({ id: oc.id, status: oc.status, codigo: oc.codigo })} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                Atualizar Status
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ordem de Compra — {oc.codigo}</h1>
        <p className="text-sm text-gray-500 mt-1">Emitido em {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {isAtrasada && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5">
          <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">Entrega atrasada há {diasAtraso} dia{diasAtraso !== 1 ? 's' : ''}</p>
            <p className="text-xs text-red-500 mt-0.5">
              Previsão era <RelDate date={oc.dataEntrega!} />. Entre em contato com o fornecedor.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Fornecedor */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 size={15} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fornecedor</p>
          </div>
          <button onClick={() => navigate(`/compras?q=${encodeURIComponent(oc.fornecedor?.razaoSocial ?? '')}`)} className="text-sm font-bold text-gray-900 hover:text-blue-600 transition text-left" title="Ver todas as OCs deste fornecedor">
            {oc.fornecedor?.razaoSocial}
          </button>
          {oc.fornecedor?.cnpj && <CopyText text={oc.fornecedor.cnpj} className="text-xs text-gray-400 mt-0.5 font-mono" />}
          {oc.fornecedor?.telefone && <CopyText text={oc.fornecedor.telefone} className="text-xs text-gray-500 mt-1" />}
          {oc.fornecedor?.email && <CopyText text={oc.fornecedor.email} className="text-xs text-gray-500" />}
        </div>

        {/* Datas */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Datas</p>
          </div>
          <div className="space-y-1.5">
            <div>
              <p className="text-xs text-gray-400">Data do pedido</p>
              <p className="text-sm font-semibold text-gray-800"><RelDate date={oc.dataPedido} /></p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Previsão de entrega</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className={`text-sm font-semibold ${isAtrasada ? 'text-red-600' : 'text-gray-800'}`}>
                  {oc.dataEntrega ? <RelDate date={oc.dataEntrega} /> : '—'}
                </p>
                {isAtrasada && <span className="flex items-center gap-0.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full"><AlertCircle size={9} /> {diasAtraso}d de atraso</span>}
              </div>
            </div>
            {oc.dataRecebimento && (
              <div>
                <p className="text-xs text-gray-400">Recebido em</p>
                <p className="text-sm font-semibold text-green-700"><RelDate date={oc.dataRecebimento} /></p>
              </div>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <StatusIcon size={15} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</p>
          </div>
          <button onClick={() => navigate(`/compras?status=${oc.status}`)} className={`inline-flex items-center text-sm font-semibold px-3 py-1 rounded-full border hover:opacity-75 transition ${statusColors[oc.status] ?? ''}`} title={`Ver todas as OCs com status ${statusLabels[oc.status] ?? oc.status}`}>
            {statusLabels[oc.status] ?? oc.status}
          </button>
          {oc.status === 'recebida' && <p className="text-xs text-green-600 mt-2">Estoque atualizado automaticamente.</p>}
        </div>

        {/* Valor total */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={15} className="text-gray-400" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-gray-400 mt-0.5">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</p>
        </div>
      </div>

      {oc.observacoes && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl px-5 py-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Observações</p>
          <p className="text-sm text-amber-800 leading-relaxed">{oc.observacoes}</p>
        </div>
      )}

      {/* Itens */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <ShoppingCart size={15} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-700">Itens da Ordem de Compra</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{itens.length}</span>
          {oc.status === 'pendente' && (
            <button onClick={() => setModalItem(true)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition print:hidden">
              <Plus size={13} /> Adicionar Item
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/40">
                {['#', 'Material', 'Código', 'Unid.', 'Qtd.', 'Preço Unitário', 'Subtotal', ''].map((h, i) => (
                  <th key={i} className={`text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3 ${h === '' ? 'print:hidden' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {itens.map((item, idx) => (
                <tr key={item.id} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3.5 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-3.5">
                    {item.material?.nome ? (
                      <button onClick={() => navigate(`/estoque/${item.material!.id}`)} className="text-sm font-medium text-gray-900 hover:text-blue-600 transition text-left">{item.material.nome}</button>
                    ) : <span className="text-sm text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">{item.material?.codigo ? <CopyText text={item.material.codigo} className="text-xs font-mono text-blue-600" /> : <span className="text-gray-300">—</span>}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{item.material?.unidadeMedida ?? '—'}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-700 font-medium">{item.quantidade}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">R$ {item.precoUnitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">R$ {(item.quantidade * item.precoUnitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-3.5 print:hidden">
                    {oc.status === 'pendente' && (
                      confirmRemover === item.id ? (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => { removerItem.mutate({ ocId: id!, itemId: item.id }); setConfirmRemover(null); }} className="text-xs text-red-600 font-medium hover:underline">Confirmar</button>
                          <button onClick={() => setConfirmRemover(null)} className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmRemover(item.id)} className="p-1 text-gray-300 hover:text-red-500 transition rounded" aria-label="Remover item">
                          <Trash2 size={14} />
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 bg-gray-50">
                <td colSpan={6} className="px-5 py-4 text-sm font-bold text-gray-700 text-right">Total da OC:</td>
                <td className="px-5 py-4 text-base font-bold text-blue-700">R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td className="print:hidden" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <AdicionarItemOCModal open={modalItem} onClose={() => setModalItem(false)} ocId={id!} />
      <EditarOCModal oc={ocEditar} onClose={() => setOcEditar(null)} />
      <AtualizarStatusOCModal oc={ocStatus} onClose={() => setOcStatus(null)} />
    </div>
  );
}
