import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type FuncionariosKPIs = {
  total: number; motoristas: number; mecanicos: number;
  ativos: number; inativos: number; cnhVencendo: number;
};

export type CnhAlertItem = { id: string; nome: string; cnhCategoria?: string; cnhValidade: string; telefone: string };

export type MotoristaDisponivelItem = { id: string; nome: string; cnhCategoria?: string };

export function useFuncionariosKPIs() {
  return useQuery({
    queryKey: ['funcionarios-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/funcionarios/kpis');
      return data.data as FuncionariosKPIs;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCnhVencendo() {
  return useQuery({
    queryKey: ['cnh-vencendo'],
    queryFn: async () => {
      const { data } = await api.get('/funcionarios/cnh-vencendo');
      return data.data as CnhAlertItem[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useMotoristasDisponiveis() {
  return useQuery({
    queryKey: ['motoristas-disponiveis'],
    queryFn: async () => {
      const { data } = await api.get('/funcionarios/motoristas-disponiveis');
      return data.data as MotoristaDisponivelItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
