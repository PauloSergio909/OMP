import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type EquipamentosKPIs = {
  total: number; disponiveis: number; emUso: number;
  manutencao: number; revisaoVencendo: number; valorPatrimonio: number;
};

export type RevisaoVencendoItem = {
  id: string; codigo: string; nome: string; tipo: string;
  proximaRevisao: string | null; status: string;
  responsavel: { id: string; nome: string } | null;
  vencida: boolean; diasRestantes: number | null;
};

export function useEquipamentosKPIs() {
  return useQuery({
    queryKey: ['equipamentos-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/equipamentos/kpis');
      return data.data as EquipamentosKPIs;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useEquipamentosRevisoesVencendo() {
  return useQuery({
    queryKey: ['equipamentos-revisoes-vencendo'],
    queryFn: async () => {
      const { data } = await api.get('/equipamentos/revisoes-vencendo');
      return data.data as RevisaoVencendoItem[];
    },
    staleTime: 1000 * 60 * 5,
  });
}
