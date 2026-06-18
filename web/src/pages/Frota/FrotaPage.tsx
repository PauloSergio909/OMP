// ══════════════════════════════════════════════════════════════
// FROTA PAGE — Gestão da frota de caminhões
// ══════════════════════════════════════════════════════════════
// Exibe caminhões em cards visuais com status, motorista, KM,
// e próxima manutenção. Filtro por status.

import { useState } from 'react';
import { Truck, Plus, MapPin, Gauge, User, Calendar, Wrench, Settings } from 'lucide-react';
import { KPICard } from '../../components/ui/KPICard';
import { StatusBadge } from '../../components/ui/StatusBadge';

// ─── DADOS MOCKADOS ──────────────────────────────────────────
const caminhoes = [
  { codigo: 'CAM-001', placa: 'ABC1D23', modelo: 'Volvo FH 540', fabricante: 'Volvo', ano: 2022, km: 185420, status: 'operacional', motorista: 'Carlos Silva', proxManut: '15/03/2026' },
  { codigo: 'CAM-002', placa: 'DEF4E56', modelo: 'Scania R450', fabricante: 'Scania', ano: 2021, km: 220180, status: 'manutencao', motorista: 'João Santos', proxManut: '—' },
  { codigo: 'CAM-003', placa: 'GHI7F89', modelo: 'Mercedes Actros', fabricante: 'Mercedes-Benz', ano: 2023, km: 95600, status: 'operacional', motorista: null, proxManut: '22/03/2026' },
  { codigo: 'CAM-004', placa: 'JKL2M34', modelo: 'Volvo FH 460', fabricante: 'Volvo', ano: 2020, km: 312500, status: 'parado', motorista: null, proxManut: '01/02/2026' },
  { codigo: 'CAM-005', placa: 'NOP5Q67', modelo: 'Scania R500', fabricante: 'Scania', ano: 2024, km: 42300, status: 'operacional', motorista: 'Ricardo Lima', proxManut: '10/04/2026' },
  { codigo: 'CAM-006', placa: 'RST8U90', modelo: 'DAF XF 530', fabricante: 'DAF', ano: 2023, km: 128000, status: 'operacional', motorista: 'Fernando Costa', proxManut: '28/02/2026' },
];

const statusFilterOptions = ['todos', 'operacional', 'manutencao', 'parado'] as const;
const statusFilterLabels: Record<string, string> = {
  todos: 'Todos',
  operacional: 'Operacionais',
  manutencao: 'Em Manutenção',
  parado: 'Parados',
};

const statusBarColors: Record<string, string> = {
  operacional: 'bg-green-500',
  manutencao:  'bg-amber-500',
  parado:      'bg-red-500',
};

export function FrotaPage() {
  const [filtro, setFiltro] = useState<string>('todos');

  const filtrados = filtro === 'todos'
    ? caminhoes
    : caminhoes.filter((c) => c.status === filtro);

  const operacionais = caminhoes.filter((c) => c.status === 'operacional').length;
  const emManut = caminhoes.filter((c) => c.status === 'manutencao').length;
  const parados = caminhoes.filter((c) => c.status === 'parado').length;

  return (
    <div className="space-y-6">
      {/* ─── KPI CARDS ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard title="Total da Frota" value={caminhoes.length} subtitle="veículos cadastrados" icon={Truck} color="blue" />
        <KPICard title="Operacionais" value={operacionais} subtitle={`${((operacionais / caminhoes.length) * 100).toFixed(0)}% disponíveis`} icon={Truck} color="green" />
        <KPICard title="Em Manutenção" value={emManut} subtitle="com OS aberta" icon={Wrench} color="orange" />
        <KPICard title="Parados" value={parados} subtitle="fora de operação" icon={Truck} color="red" />
      </div>

      {/* ─── TOOLBAR ─── */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1.5">
          {statusFilterOptions.map((s) => (
            <button
              key={s}
              onClick={() => setFiltro(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filtro === s
                  ? 'bg-fleet-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {statusFilterLabels[s]}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fleet-primary text-white text-sm font-medium hover:bg-fleet-secondary transition">
          <Plus size={15} /> Novo Caminhão
        </button>
      </div>

      {/* ─── GRID DE CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtrados.map((cam) => (
          <div
            key={cam.codigo}
            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
          >
            {/* Barra de status no topo */}
            <div className={`h-1.5 ${statusBarColors[cam.status]}`} />

            <div className="p-5">
              {/* Header do card */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-gray-900">{cam.codigo}</h3>
                    <StatusBadge status={cam.status} />
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{cam.modelo}</p>
                </div>
                <button className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition">
                  <Settings size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={13} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{cam.placa}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Gauge size={13} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{cam.km.toLocaleString('pt-BR')} km</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User size={13} className="text-gray-400" />
                  <span className={`font-medium ${cam.motorista ? 'text-gray-700' : 'text-gray-400 italic'}`}>
                    {cam.motorista || 'Sem motorista'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar size={13} className="text-gray-400" />
                  <span className="font-medium text-gray-700">{cam.proxManut}</span>
                </div>
              </div>

              {/* Footer com info extra */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">{cam.fabricante} • {cam.ano}</span>
                <button className="text-xs text-fleet-info hover:text-fleet-info/80 font-medium">
                  Ver detalhes →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
