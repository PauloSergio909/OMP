import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export type SearchResults = {
  total: number;
  caminhoes: { id: string; codigo: string; placa: string; modelo: string; status: string }[];
  ordens: { id: string; codigo: string; tipo: string; status: string; prioridade: string; caminhao: { placa: string } | null }[];
  materiais: { id: string; codigo: string; nome: string; unidadeMedida: string }[];
  funcionarios: { id: string; nome: string; cargo: string; cpf: string }[];
  equipamentos: { id: string; codigo: string; nome: string; tipo: string; status: string }[];
  fornecedores: { id: string; razaoSocial: string; cnpj: string; email: string | null }[];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useSearch(q: string) {
  return useQuery({
    queryKey: ['search', q],
    queryFn: async () => {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`);
      return data.data as SearchResults;
    },
    enabled: q.trim().length >= 2,
    staleTime: 1000 * 30,
  });
}
