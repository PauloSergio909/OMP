// ══════════════════════════════════════════════════════════════
// DASHBOARD PAGE — Visão geral do sistema
// ══════════════════════════════════════════════════════════════
// KPIs em cards + gráficos + alertas + tabela de OS recentes.
// Usa dados mockados por enquanto (conectar à API depois).

import { useState } from 'react';
import {
  Package, Truck, ClipboardList, DollarSign,
  AlertTriangle, Bell, ArrowRight, Calendar,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import { KPICard } from '../../components/ui/KPICard';
import { StatusBadge } from '../../components/ui/StatusBadge';

// ─── DADOS MOCKADOS (substituir por hooks de API depois) ─────

const consumoMensal = [
  { mes: 'Set', oleo: 420, filtros: 35, pneus: 8, freios: 12 },
  { mes: 'Out', oleo: 380, filtros: 42, pneus: 12, freios: 8 },
  { mes: 'Nov', oleo: 510, filtros: 38, pneus: 6, freios: 15 },
  { mes: 'Dez', oleo: 470, filtros: 45, pneus: 10, freios: 11 },
  { mes: 'Jan', oleo: 530, filtros: 40, pneus: 14, freios: 9 },
  { mes: 'Fev', oleo: 490, filtros: 48, pneus: 9, freios: 13 },
];

const custoCategoria = [
  { name: 'Pneus', value: 42500, color: '#F77F00' },
  { name: 'Óleos', value: 18200, color: '#118AB2' },
  { name: 'Filtros', value: 8900, color: '#06D6A0' },
  { name: 'Freios', value: 12600, color: '#EF476F' },
  { name: 'Outros', value: 5800, color: '#8B5CF6' },
];

const manutencaoMensal = [
  { mes: 'Set', preventiva: 18, corretiva: 7 },
  { mes: 'Out', preventiva: 22, corretiva: 5 },
  { mes: 'Nov', preventiva: 15, corretiva: 9 },
  { mes: 'Dez', preventiva: 20, corretiva: 6 },
  { mes: 'Jan', preventiva: 24, corretiva: 4 },
  { mes: 'Fev', preventiva: 19, corretiva: 8 },
];

const osRecentes = [
  { codigo: 'OS-2026-012', caminhao: 'CAM-001 • Volvo FH 540', tipo: 'preventiva', status: 'em_andamento', prioridade: 'alta', previsao: '10/02/2026' },
  { codigo: 'OS-2026-011', caminhao: 'CAM-003 • Mercedes Actros', tipo: 'corretiva', status: 'aguardando_peca', prioridade: 'critica', previsao: '08/02/2026' },
  { codigo: 'OS-2026-010', caminhao: 'CAM-002 • Scania R450', tipo: 'preventiva', status: 'agendada', prioridade: 'media', previsao: '15/02/2026' },
  { codigo: 'OS-2026-009', caminhao: 'CAM-005 • Volvo FH 460', tipo: 'corretiva', status: 'concluida', prioridade: 'alta', previsao: '05/02/2026' },
];

const alertas = [
  { id: '1', nivel: 'critico', msg: 'Pneu 295/80 R22.5 — estoque em 8 un (mínimo: 12)', tempo: '2h atrás' },
  { id: '2', nivel: 'critico', msg: 'Correia do Alternador — estoque em 5 un (mínimo: 8)', tempo: '3h atrás' },
  { id: '3', nivel: 'alerta', msg: 'Óleo Câmbio 75W-90 — estoque em 60L (mínimo: 80)', tempo: '5h atrás' },
  { id: '4', nivel: 'info', msg: 'CAM-002 — manutenção preventiva vence em 5 dias', tempo: '1d atrás' },
];

const alertColors: Record<string, string> = {
  critico: 'bg-red-50 border-red-200 text-red-700',
  alerta:  'bg-amber-50 border-amber-200 text-amber-700',
  info:    'bg-blue-50 border-blue-200 text-blue-700',
};

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* ─── KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          title="Materiais em Estoque"
          value="847"
          subtitle="8 materiais — 3 abaixo do mínimo"
          icon={Package}
          color="blue"
          trend={{ value: -2.3, label: 'vs mês anterior' }}
        />
        <KPICard
          title="Frota Operacional"
          value="12/15"
          subtitle="80% de disponibilidade"
          icon={Truck}
          color="green"
          trend={{ value: 5.0, label: 'vs mês anterior' }}
        />
        <KPICard
          title="OS Abertas"
          value="7"
          subtitle="2 urgentes — 3 em andamento"
          icon={ClipboardList}
          color="orange"
        />
        <KPICard
          title="Custo Mensal"
          value="R$ 88.000"
          subtitle="Materiais + Mão de obra"
          icon={DollarSign}
          color="purple"
          trend={{ value: 12.5, label: 'vs mês anterior' }}
        />
      </div>

      {/* ─── GRÁFICOS (2 colunas) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de Consumo de Materiais (2/3 da largura) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Consumo de Materiais</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos 6 meses por categoria</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={consumoMensal}>
              <defs>
                <linearGradient id="gradOleo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#118AB2" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#118AB2" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradFiltros" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06D6A0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06D6A0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Area type="monotone" dataKey="oleo" stroke="#118AB2" fill="url(#gradOleo)" strokeWidth={2} name="Óleos (L)" />
              <Area type="monotone" dataKey="filtros" stroke="#06D6A0" fill="url(#gradFiltros)" strokeWidth={2} name="Filtros (un)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Custo por Categoria (1/3) */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Custo por Categoria</h3>
          <p className="text-xs text-gray-400 mb-3">Fevereiro 2026</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={custoCategoria}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {custoCategoria.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legenda */}
          <div className="space-y-1.5 mt-2">
            {custoCategoria.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">R$ {(item.value / 1000).toFixed(1)}k</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── MANUTENÇÃO + ALERTAS (2 colunas) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico Preventiva vs Corretiva */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Manutenções Preventivas vs Corretivas</h3>
          <p className="text-xs text-gray-400 mb-4">Meta: {'>'} 70% preventivas</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={manutencaoMensal} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="preventiva" fill="#06D6A0" radius={[6, 6, 0, 0]} name="Preventiva" />
              <Bar dataKey="corretiva" fill="#EF476F" radius={[6, 6, 0, 0]} name="Corretiva" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Painel de Alertas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-fleet-accent" />
              <h3 className="text-sm font-semibold text-gray-900">Alertas</h3>
            </div>
            <span className="text-xs bg-fleet-danger/10 text-fleet-danger px-2 py-0.5 rounded-full font-medium">
              {alertas.filter((a) => a.nivel === 'critico').length} críticos
            </span>
          </div>
          <div className="space-y-2.5">
            {alertas.map((alerta) => (
              <div
                key={alerta.id}
                className={`p-3 rounded-xl border text-xs ${alertColors[alerta.nivel]}`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium leading-snug">{alerta.msg}</p>
                    <p className="opacity-60 mt-1">{alerta.tempo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── TABELA DE OS RECENTES ─── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Ordens de Serviço Recentes</h3>
          <button className="text-xs text-fleet-info hover:text-fleet-info/80 font-medium flex items-center gap-1">
            Ver todas <ArrowRight size={12} />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50">
                {['Código', 'Caminhão', 'Tipo', 'Status', 'Prioridade', 'Previsão'].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-2.5">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {osRecentes.map((os) => (
                <tr key={os.codigo} className="hover:bg-gray-50/50 transition">
                  <td className="px-5 py-3 text-sm font-mono font-semibold text-fleet-primary">{os.codigo}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{os.caminhao}</td>
                  <td className="px-5 py-3"><StatusBadge status={os.tipo} /></td>
                  <td className="px-5 py-3"><StatusBadge status={os.status} /></td>
                  <td className="px-5 py-3"><StatusBadge status={os.prioridade} /></td>
                  <td className="px-5 py-3 text-sm text-gray-500 flex items-center gap-1.5">
                    <Calendar size={13} className="text-gray-400" /> {os.previsao}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
