import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type ManutencaoAlertItem = { id: string; codigo: string; placa: string; modelo: string; proximaManutencao: string };

export type ProximoManutencaoKmItem = {
  id: string; codigo: string; placa: string; modelo: string; status: string;
  kmAtual: number; proximaManutencaoKm: number; kmRestantes: number;
  motoristaNome: string | null; urgente: boolean;
};

export type DocumentoVencendoItem = {
  id: string; codigo: string; modelo: string; placa: string; status: string;
  vencimentoCrlv: string | null; vencimentoSeguro: string | null; numeroSeguro: string | null;
};

export type FrotaKPIs = {
  total: number; operacionais: number; emManutencao: number;
  parados: number; manutencaoVencendo: number; taxaDisponibilidade: number;
};

export type CustoPorKmItem = {
  id: string; caminhao: string; modelo: string; fabricante: string;
  kmAtual: number; kmRodados: number;
  custoOS: number; custoCombustivel: number; total: number; custoPorKm: number;
};

export type RankingCustoItem = {
  caminhao: string; modelo: string; fabricante: string;
  custoOS: number; custoCombustivel: number; total: number;
};

export function useManutencaoVencendo() {
  return useQuery({
    queryKey: ['manutencao-vencendo'],
    queryFn: async () => {
      const { data } = await api.get('/frota/manutencao-vencendo');
      return data.data as ManutencaoAlertItem[];
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useProximosManutencaoKm(margem = 1000) {
  return useQuery({
    queryKey: ['frota-proximos-manutencao-km', margem],
    queryFn: async () => {
      const { data } = await api.get(`/frota/proximos-manutencao-km?margem=${margem}`);
      return data.data as ProximoManutencaoKmItem[];
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useDocumentosVencendo() {
  return useQuery({
    queryKey: ['documentos-vencendo'],
    queryFn: async () => {
      const { data } = await api.get('/frota/documentos-vencendo');
      return data.data as DocumentoVencendoItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFrotaKPIs() {
  return useQuery({
    queryKey: ['frota-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/frota/kpis');
      return data.data as FrotaKPIs;
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 5,
  });
}

export function useFrotaCustoPorKm() {
  return useQuery({
    queryKey: ['frota-custo-por-km'],
    queryFn: async () => {
      const { data } = await api.get('/frota/custo-por-km');
      return data.data as CustoPorKmItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFrotaRankingCusto(top = 10) {
  return useQuery({
    queryKey: ['frota-ranking-custo', top],
    queryFn: async () => {
      const { data } = await api.get(`/frota/ranking-custo?top=${top}`);
      return data.data as RankingCustoItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
