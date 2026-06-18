import { useNavigate } from 'react-router-dom';
import { Users, Car, Wrench, AlertTriangle, Download, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useFuncionariosKPIs, useCnhVencendo } from '../../../hooks/useApi';
import { RelDate } from '../../../components/ui/RelDate';
import { exportCsv } from '../../../utils/exportCsv';
import { printDocument, buildRelatorioTabHtml } from '../../../utils/printDocument';

export function TabFuncionarios() {
  const navigate = useNavigate();
  const { data: funcKPIs } = useFuncionariosKPIs();
  const { data: cnhVencendo = [] } = useCnhVencendo();

  const outros = (funcKPIs?.ativos ?? 0) - (funcKPIs?.motoristas ?? 0) - (funcKPIs?.mecanicos ?? 0);
  const cargoPie = [
    { name: 'Motoristas', value: funcKPIs?.motoristas ?? 0, color: '#118AB2' },
    { name: 'Mecânicos', value: funcKPIs?.mecanicos ?? 0, color: '#F77F00' },
    { name: 'Outros', value: Math.max(0, outros), color: '#8b5cf6' },
    { name: 'Inativos', value: funcKPIs?.inativos ?? 0, color: '#d1d5db' },
  ].filter((s) => s.value > 0);

  function exportarPDF() {
    const kpis = [
      { label: 'Total', value: funcKPIs?.total ?? '—' },
      { label: 'Ativos', value: funcKPIs?.ativos ?? '—', sub: `${funcKPIs?.inativos ?? 0} inativo(s)` },
      { label: 'Motoristas', value: funcKPIs?.motoristas ?? '—' },
      { label: 'Mecânicos', value: funcKPIs?.mecanicos ?? '—' },
    ];
    const secoes = cnhVencendo.length > 0 ? [{
      titulo: 'CNH Vencendo / Vencida',
      headers: ['Motorista', 'Categoria', 'Validade', 'Dias', 'Status'],
      rows: cnhVencendo.map((m) => {
        const d = Math.ceil((new Date(m.cnhValidade).getTime() - Date.now()) / 86400000);
        return [m.nome, m.cnhCategoria ?? '—', new Date(m.cnhValidade).toLocaleDateString('pt-BR'), d, d < 0 ? 'VENCIDA' : 'VENCENDO'];
      }),
    }] : [];
    printDocument(buildRelatorioTabHtml('Funcionários', kpis, secoes), 'Relatório — Funcionários');
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end print:hidden">
        <button
          onClick={exportarPDF}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
        >
          <FileText size={15} /> Exportar PDF
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button onClick={() => navigate('/funcionarios')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-blue-500" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase">Total</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{funcKPIs?.total ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">funcionários cadastrados</p>
        </button>
        <button onClick={() => navigate('/funcionarios')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-green-200 transition">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} className="text-green-500" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase">Ativos</p>
          </div>
          <p className="text-2xl font-bold text-green-700">{funcKPIs?.ativos ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">{funcKPIs?.inativos ?? 0} inativo(s)</p>
        </button>
        <button onClick={() => navigate((funcKPIs?.cnhVencendo ?? 0) > 0 ? '/funcionarios?cnh=1' : '/funcionarios?cargo=motorista')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-blue-200 transition" title={(funcKPIs?.cnhVencendo ?? 0) > 0 ? 'Ver motoristas com CNH vencendo' : 'Ver motoristas'}>
          <div className="flex items-center gap-2 mb-2">
            <Car size={14} className="text-blue-500" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase">Motoristas</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{funcKPIs?.motoristas ?? '—'}</p>
          <p className={`text-xs mt-1 ${(funcKPIs?.cnhVencendo ?? 0) > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
            {(funcKPIs?.cnhVencendo ?? 0) > 0 ? `${funcKPIs?.cnhVencendo} CNH vencendo` : 'ativos com CNH'}
          </p>
        </button>
        <button onClick={() => navigate('/funcionarios?cargo=mecanico')} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-orange-200 transition">
          <div className="flex items-center gap-2 mb-2">
            <Wrench size={14} className="text-orange-500" />
            <p className="text-[11px] font-semibold text-gray-400 uppercase">Mecânicos</p>
          </div>
          <p className="text-2xl font-bold text-gray-900">{funcKPIs?.mecanicos ?? '—'}</p>
          <p className="text-xs text-gray-400 mt-1">ativos na oficina</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribuição por cargo */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Distribuição por Cargo</h3>
          <p className="text-xs text-gray-400 mb-4">Total de funcionários por função</p>
          {cargoPie.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400 text-xs">
              Nenhum funcionário cadastrado
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={cargoPie}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={72}
                    paddingAngle={3} dataKey="value"
                  >
                    {cargoPie.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 flex-1">
                {cargoPie.map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-gray-600 flex-1">{s.name}</span>
                    <span className="font-bold text-gray-900">{s.value}</span>
                    <span className="text-xs text-gray-400">
                      ({funcKPIs?.total ? Math.round((s.value / funcKPIs.total) * 100) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CNH vencendo */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">CNH Vencendo / Vencida</h3>
              {cnhVencendo.length > 0 && (
                <button onClick={() => navigate('/funcionarios?cnh=1')} className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium hover:bg-amber-100 transition" title="Ver funcionários com CNH vencendo">
                  {cnhVencendo.length}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {cnhVencendo.length > 0 && (
                <button
                  onClick={() => exportCsv(
                    'cnh-vencendo.csv',
                    ['Motorista', 'Categoria CNH', 'Validade', 'Dias restantes', 'Status'],
                    cnhVencendo.map((m) => {
                      const dias = Math.ceil((new Date(m.cnhValidade).getTime() - Date.now()) / 86400000);
                      return [m.nome, m.cnhCategoria ?? '—', new Date(m.cnhValidade).toLocaleDateString('pt-BR'), dias, dias < 0 ? 'VENCIDA' : 'VENCENDO'];
                    }),
                  )}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition print:hidden"
                >
                  <Download size={12} /> CSV
                </button>
              )}
              <button
                onClick={() => navigate('/funcionarios?cnh=1')}
                className="text-xs text-blue-600 hover:underline print:hidden"
              >
                Ver todos →
              </button>
            </div>
          </div>
          {cnhVencendo.length === 0 ? (
            <div className="py-10 flex flex-col items-center text-gray-400">
              <Car size={28} className="mb-2 opacity-30" />
              <p className="text-sm">Todas as CNH estão em dia</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {cnhVencendo.map((m) => {
                const dias = Math.ceil((new Date(m.cnhValidade).getTime() - Date.now()) / 86400000);
                const vencida = dias < 0;
                return (
                  <button
                    key={m.id}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition"
                    onClick={() => navigate(`/funcionarios/${m.id}`)}
                    title="Ver perfil do funcionário"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${vencida ? 'bg-red-50' : 'bg-amber-50'}`}>
                      <Car size={14} className={vencida ? 'text-red-500' : 'text-amber-500'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{m.nome}</p>
                      <p className="text-xs text-gray-400">
                        CNH {m.cnhCategoria ?? '—'} • válida <RelDate date={m.cnhValidade} />
                      </p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${vencida ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {vencida ? `${Math.abs(dias)}d vencida` : `${dias}d`}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
