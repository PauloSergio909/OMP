import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type OSKPIs = {
  abertas: number; urgentes: number; atrasadas: number;
  concluidasMes: number; custoMes: number;
  concluidasMesAnterior: number; custoMesAnterior: number;
  preventivas: number; corretivas: number; taxaPreventiva: number;
};

export type OSTempoMedio = {
  mediaDias: number | null; totalConcluidas: number;
  porTipo: { tipo: string; mediaDias: number | null; total: number }[];
};

export type OSPorStatus = { status: string; total: number };

export type CustoPorCaminhaoItem = { caminhao: string; modelo: string; preventiva: number; corretiva: number };

export type TendenciaMensalItem = { mes: string; abertas: number; concluidas: number; custo: number };

export type OSPorMecanicoItem = { id: string; nome: string; cargo: string; abertas: number; concluidas: number; total: number };

export function useOrdensServicoKPIs() {
  return useQuery({
    queryKey: ['ordens-servico-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/ordens-servico/kpis');
      return data.data as OSKPIs;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useOSPorStatus() {
  return useQuery({
    queryKey: ['os-por-status'],
    queryFn: async () => {
      const { data } = await api.get('/ordens-servico/por-status');
      return data.data as OSPorStatus[];
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
}

export function useOSTempoMedio() {
  return useQuery({
    queryKey: ['os-tempo-medio'],
    queryFn: async () => {
      const { data } = await api.get('/ordens-servico/tempo-medio-resolucao');
      return data.data as OSTempoMedio;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCustoPorCaminhao() {
  return useQuery({
    queryKey: ['os-custo-por-caminhao'],
    queryFn: async () => {
      const { data } = await api.get('/ordens-servico/custo-por-caminhao');
      return data.data as CustoPorCaminhaoItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOsPorMecanico() {
  return useQuery({
    queryKey: ['os-por-mecanico'],
    queryFn: async () => {
      const { data } = await api.get('/ordens-servico/por-mecanico');
      return data.data as OSPorMecanicoItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useOSTendenciaMensal(meses = 6) {
  return useQuery({
    queryKey: ['os-tendencia-mensal', meses],
    queryFn: async () => {
      const { data } = await api.get(`/ordens-servico/tendencia-mensal?meses=${meses}`);
      return data.data as TendenciaMensalItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
