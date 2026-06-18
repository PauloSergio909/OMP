import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type AbastecimentosKPIs = {
  abastecimentosMes: number; litrosMes: number;
  custoMes: number; precoMedioLitro: number;
};

export type HistoricoMensalItem = { mes: string; litros: number; custo: number; abastecimentos: number };

export type ConsumoPorCaminhaoItem = {
  caminhaoId: string;
  _sum: { litros: number | null };
  _count: number;
  caminhao: { id: string; codigo: string; modelo: string } | undefined;
};

export type EficienciaCaminhao = { mediaKmL: number | null; totalAbastecimentos: number };

export type RankingEficienciaItem = {
  caminhaoId: string; codigo: string; placa: string; modelo: string;
  mediaKmL: number; totalLitros: number; totalAbastecimentos: number;
};

export function useAbastecimentosKPIs(caminhaoId?: string) {
  return useQuery({
    queryKey: ['abastecimentos-kpis', caminhaoId],
    queryFn: async () => {
      const params = caminhaoId ? `?caminhaoId=${caminhaoId}` : '';
      const { data } = await api.get(`/abastecimentos/kpis${params}`);
      return data.data as AbastecimentosKPIs;
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useHistoricoAbastecimento(meses = 6, caminhaoId?: string) {
  return useQuery({
    queryKey: ['abastecimentos-historico', meses, caminhaoId],
    queryFn: async () => {
      const params = new URLSearchParams({ meses: String(meses) });
      if (caminhaoId) params.set('caminhaoId', caminhaoId);
      const { data } = await api.get(`/abastecimentos/historico-mensal?${params}`);
      return data.data as HistoricoMensalItem[];
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 10,
  });
}

export function useConsumoPorCaminhao() {
  return useQuery({
    queryKey: ['abastecimento-consumo-por-caminhao'],
    queryFn: async () => {
      const { data } = await api.get('/abastecimentos/consumo-por-caminhao');
      return data.data as ConsumoPorCaminhaoItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useEficienciaCaminhao(caminhaoId: string | undefined) {
  return useQuery({
    queryKey: ['abastecimento-eficiencia', caminhaoId],
    queryFn: async () => {
      const { data } = await api.get(`/abastecimentos/eficiencia/${caminhaoId}`);
      return data.data as EficienciaCaminhao;
    },
    enabled: !!caminhaoId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRankingEficiencia() {
  return useQuery({
    queryKey: ['abastecimento-ranking-eficiencia'],
    queryFn: async () => {
      const { data } = await api.get('/abastecimentos/ranking-eficiencia');
      return data.data as RankingEficienciaItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
