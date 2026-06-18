import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type EstoqueAlertaItem = {
  id: string; nome: string; codigo: string; unidadeMedida: string;
  estoqueMinimo: number; estoques: { quantidade: number; ultimaAtualizacao?: string }[];
};

export type EstoqueKPIs = {
  totalMateriais: number;
  itensAbaixoMinimo: number;
  valorEstoque: number;
  materiaisCriticos: EstoqueAlertaItem[];
};

export function useEstoqueKPIs() {
  return useQuery({
    queryKey: ['estoque-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/estoque/kpis');
      return data.data as EstoqueKPIs;
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
}

export function useEstoqueAlertas() {
  return useQuery({
    queryKey: ['estoque-alertas'],
    queryFn: async () => {
      const { data } = await api.get('/estoque/alertas');
      return data.data as EstoqueAlertaItem[];
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
}
