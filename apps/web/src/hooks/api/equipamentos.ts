import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

function invalidateEquipamentosBase(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['equipamentos'] });
  qc.invalidateQueries({ queryKey: ['equipamentos-kpis'] });
  qc.invalidateQueries({ queryKey: ['equipamentos-revisoes-vencendo'] });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type EquipamentoListItem = {
  id: string; codigo: string; nome: string; tipo: string;
  status: string; ativo: boolean; numeroSerie?: string | null;
  fabricante?: string | null; modelo?: string | null;
  localizacao?: string | null; proximaRevisao?: string | null;
  valorAquisicao?: number | null; dataAquisicao?: string | null;
  observacoes?: string | null;
  responsavel: { id: string; nome: string; cargo: string } | null;
};

export type MovimentacaoEquipamentoItem = {
  id: string; tipo: string; createdAt: string;
  destino?: string | null; observacoes?: string | null;
  responsavel: { id: string; nome: string } | null;
};

export type EquipamentoDetalhe = {
  id: string; codigo: string; nome: string; tipo: string;
  status: string; ativo: boolean;
  numeroSerie?: string | null; fabricante?: string | null; modelo?: string | null;
  localizacao?: string | null; proximaRevisao?: string | null;
  valorAquisicao?: number | null; dataAquisicao?: string | null;
  observacoes?: string | null; descricao?: string | null;
  responsavel: { id: string; nome: string; cargo: string; telefone: string } | null;
  movimentacoes: MovimentacaoEquipamentoItem[];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useEquipamentos(page = 1, search = '', tipo?: string, status?: string, revisoesVencendo?: boolean) {
  return useQuery({
    queryKey: ['equipamentos', page, search, tipo, status, revisoesVencendo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (search) params.set('search', search);
      if (tipo) params.set('tipo', tipo);
      if (status) params.set('status', status);
      if (revisoesVencendo) params.set('revisao', '1');
      const { data } = await api.get(`/equipamentos?${params}`);
      return data as PaginatedResponse<EquipamentoListItem>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useEquipamentoDetalhe(id: string) {
  return useQuery({
    queryKey: ['equipamento', id],
    queryFn: async () => {
      const { data } = await api.get(`/equipamentos/${id}`);
      return data.data as EquipamentoDetalhe;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      nome: string; tipo: string; descricao?: string; numeroSerie?: string;
      responsavelId?: string; localizacao?: string; dataAquisicao?: string;
      valorAquisicao?: number; fabricante?: string; modelo?: string;
      proximaRevisao?: string; observacoes?: string;
    }) => {
      const { data } = await api.post('/equipamentos', dados);
      return data;
    },
    onSuccess: () => {
      invalidateEquipamentosBase(queryClient);
      toast.success('Equipamento cadastrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao cadastrar equipamento')); },
  });
}

export function useMovimentarEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; [key: string]: unknown }) => {
      const { data } = await api.post(`/equipamentos/${id}/movimentacoes`, dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateEquipamentosBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['equipamento', vars.id] });
      toast.success('Movimentação registrada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao registrar movimentação')); },
  });
}

export function useAtualizarEquipamento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; [key: string]: unknown }) => {
      const { data } = await api.put(`/equipamentos/${id}`, dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateEquipamentosBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['equipamento', vars.id] });
      toast.success('Equipamento atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar equipamento')); },
  });
}
