import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { CopyText } from '../../components/ui/CopyText';
import type { DocumentoVencendoItem } from '../../hooks/useApi';

interface Props {
  alertas: DocumentoVencendoItem[];
}

function docInfo(c: DocumentoVencendoItem) {
  const hoje = new Date();
  const crlvDias = c.vencimentoCrlv ? Math.ceil((new Date(c.vencimentoCrlv).getTime() - hoje.getTime()) / 86400000) : null;
  const segDias  = c.vencimentoSeguro ? Math.ceil((new Date(c.vencimentoSeguro).getTime() - hoje.getTime()) / 86400000) : null;
  const partes: string[] = [];
  if (crlvDias !== null) partes.push(`CRLV: ${crlvDias < 0 ? `vencido há ${Math.abs(crlvDias)}d` : `${crlvDias}d`}`);
  if (segDias !== null) partes.push(`Seguro: ${segDias < 0 ? `vencido há ${Math.abs(segDias)}d` : `${segDias}d`}`);
  return partes.join(' · ');
}

export function BannerDocumentos({ alertas }: Props) {
  const navigate = useNavigate();
  if (alertas.length === 0) return null;

  const hoje = new Date();
  const vencidos = alertas.filter((c) =>
    (c.vencimentoCrlv && new Date(c.vencimentoCrlv) < hoje) ||
    (c.vencimentoSeguro && new Date(c.vencimentoSeguro) < hoje)
  );
  const isRed = vencidos.length > 0;

  return (
    <div className={`rounded-2xl border overflow-hidden ${isRed ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${isRed ? 'bg-red-100/50 border-red-200' : 'bg-amber-100/50 border-amber-200'}`}>
        <Shield size={16} className={`shrink-0 ${isRed ? 'text-red-500' : 'text-amber-600'}`} />
        <span className={`text-sm font-semibold ${isRed ? 'text-red-800' : 'text-amber-800'}`}>
          {vencidos.length > 0
            ? `${vencidos.length} veículo${vencidos.length > 1 ? 's' : ''} com documento vencido`
            : `${alertas.length} veículo${alertas.length > 1 ? 's' : ''} com documento vencendo`}
        </span>
      </div>
      <div className="divide-y divide-amber-100">
        {alertas.map((cam) => (
          <div key={cam.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/50 transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`p-1.5 rounded-lg ${isRed ? 'bg-red-100' : 'bg-amber-100'}`}>
                <Shield size={14} className={isRed ? 'text-red-500' : 'text-amber-600'} />
              </div>
              <div className="min-w-0">
                <button onClick={() => navigate(`/frota/${cam.id}`)} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition truncate block">
                  {cam.codigo} — {cam.modelo}
                </button>
                <CopyText text={cam.placa} className="text-xs text-gray-400 font-mono" />
              </div>
            </div>
            <p className={`text-xs font-medium shrink-0 ml-4 ${isRed ? 'text-red-600' : 'text-amber-700'}`}>
              {docInfo(cam)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
