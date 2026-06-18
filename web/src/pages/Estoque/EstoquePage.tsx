// ══════════════════════════════════════════════════════════════
// ESTOQUE PAGE — Controle de materiais e estoque
// ══════════════════════════════════════════════════════════════
// Lista materiais com barras visuais de nível, busca, filtros,
// e botões de ação rápida para entrada/saída.

import { useState } from 'react';
import {
  Package, Plus, ArrowDownToLine, ArrowUpFromLine,
  Filter, AlertTriangle, Search,
} from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import { StatusBadge } from '../../components/ui/StatusBadge';

// ─── DADOS MOCKADOS ──────────────────────────────────────────
const materiais = [
  { codigo: 'MAT-001', nome: 'Óleo Motor 15W-40', categoria: 'Óleos', unidade: 'litro', preco: 18.5, qtd: 280, min: 200, max: 800 },
  { codigo: 'MAT-002', nome: 'Filtro de Ar P/N 6841', categoria: 'Filtros', unidade: 'un', preco: 89.9, qtd: 45, min: 30, max: 100 },
  { codigo: 'MAT-003', nome: 'Pneu 295/80 R22.5', categoria: 'Pneus', unidade: 'un', preco: 1850.0, qtd: 8, min: 12, max: 40 },
  { codigo: 'MAT-004', nome: 'Pastilha Freio Diant. (Jogo)', categoria: 'Freios', unidade: 'jogo', preco: 320.0, qtd: 18, min: 10, max: 50 },
  { codigo: 'MAT-005', nome: 'Óleo Câmbio 75W-90', categoria: 'Óleos', unidade: 'litro', preco: 42.0, qtd: 60, min: 80, max: 300 },
  { codigo: 'MAT-006', nome: 'Filtro de Combustível', categoria: 'Filtros', unidade: 'un', preco: 65.0, qtd: 52, min: 25, max: 80 },
  { codigo: 'MAT-007', nome: 'Correia do Alternador', categoria: 'Outros', unidade: 'un', preco: 125.0, qtd: 5, min: 8, max: 20 },
  { codigo: 'MAT-008', nome: 'Fluido Arrefecimento', categoria: 'Óleos', unidade: 'litro', preco: 12.5, qtd: 150, min: 100, max: 400 },
];

const categorias = ['Todos', 'Óleos', 'Filtros', 'Pneus', 'Freios', 'Outros'];

export function EstoquePage() {
  const [busca, setBusca] = useState('');
  const [catFiltro, setCatFiltro] = useState('Todos');

  // Filtra materiais por busca e categoria
  const filtrados = materiais.filter((m) => {
    const matchBusca = m.nome.toLowerCase().includes(busca.toLowerCase()) ||
                       m.codigo.toLowerCase().includes(busca.toLowerCase());
    const matchCat = catFiltro === 'Todos' || m.categoria === catFiltro;
    return matchBusca && matchCat;
  });

  const abaixoMinimo = materiais.filter((m) => m.qtd < m.min).length;
  const valorTotal = materiais.reduce((sum, m) => sum + m.qtd * m.preco, 0);

  return (
    <div className="space-y-6">
      {/* ─── KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total de Materiais" value={materiais.length} subtitle="itens cadastrados" icon={Package} color="blue" />
        <KPICard
          title="Abaixo do Mínimo"
          value={abaixoMinimo}
          subtitle="precisam de reposição"
          icon={AlertTriangle}
          color="red"
        />
        <KPICard
          title="Valor em Estoque"
          value={`R$ ${(valorTotal / 1000).toFixed(1)}k`}
          subtitle="custo total estimado"
          icon={Package}
          color="purple"
        />
        <KPICard title="Movimentações Hoje" value="14" subtitle="8 entradas, 6 saídas" icon={ArrowDownToLine} color="green" />
      </div>

      {/* ─── TOOLBAR ─── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 items-center flex-wrap">
          {/* Busca */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar material..."
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-fleet-info/30"
            />
          </div>
          {/* Filtro por categoria */}
          <div className="flex gap-1.5">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFiltro(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  catFiltro === cat
                    ? 'bg-fleet-primary text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition">
            <ArrowDownToLine size={15} /> Entrada
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fleet-accent text-white text-sm font-medium hover:bg-fleet-accent/90 transition">
            <ArrowUpFromLine size={15} /> Saída
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fleet-primary text-white text-sm font-medium hover:bg-fleet-secondary transition">
            <Plus size={15} /> Novo Material
          </button>
        </div>
      </div>

      {/* ─── TABELA DE MATERIAIS ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Código', 'Material', 'Categoria', 'Preço Unit.', 'Estoque', 'Nível', 'Status'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtrados.map((m) => {
                const pct = Math.round((m.qtd / m.max) * 100);
                const isCritico = m.qtd < m.min;
                const barColor = isCritico ? 'bg-red-500' : pct < 40 ? 'bg-amber-500' : 'bg-green-500';

                return (
                  <tr key={m.codigo} className="hover:bg-gray-50/50 transition cursor-pointer">
                    <td className="px-5 py-3.5 text-sm font-mono font-semibold text-fleet-primary">
                      {m.codigo}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-medium text-gray-900">{m.nome}</div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{m.categoria}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-700 font-medium">
                      R$ {m.preco.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-sm font-bold ${isCritico ? 'text-red-600' : 'text-gray-900'}`}>
                        {m.qtd}
                      </span>
                      <span className="text-xs text-gray-400 ml-1">{m.unidade}</span>
                      <span className="text-xs text-gray-400 ml-1">(mín: {m.min})</span>
                    </td>
                    <td className="px-5 py-3.5 w-40">
                      {/* Barra visual do nível de estoque */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${barColor}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {isCritico ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-red-600/10">
                          <AlertTriangle size={11} /> Crítico
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full ring-1 ring-inset ring-green-600/10">
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-500">
          {filtrados.length} materiais encontrados
        </div>
      </div>
    </div>
  );
}
