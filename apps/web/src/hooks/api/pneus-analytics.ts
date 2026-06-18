import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type PneusKPIs = {
  total: number; ativos: number; inativos: number;
  alertas80: number; alertas95: number; vidaMediaPct: number;
};

export type PneuAlertaItem = {
  caminhaoId: string; codigo: string; placa: string; modelo: string;
  kmAtual: number; pneusAlerta: number; maxPct: number;
};

export function usePneusKPIs() {
  return useQuery({
    queryKey: ['pneus-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/pneus/kpis');
      return data.data as PneusKPIs;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function usePneusAlertas() {
  return useQuery({
    queryKey: ['pneus-alertas'],
    queryFn: async () => {
      const { data } = await api.get('/pneus/alertas');
      return data.data as PneuAlertaItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
