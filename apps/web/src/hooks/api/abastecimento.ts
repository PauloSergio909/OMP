import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

function invalidateAbastecimentoBase(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['abastecimentos'] });
  qc.invalidateQueries({ queryKey: ['abastecimentos-kpis'] });
  qc.invalidateQueries({ queryKey: ['abastecimentos-historico'] });
  qc.invalidateQueries({ queryKey: ['abastecimento-consumo-por-caminhao'] });
  qc.invalidateQueries({ queryKey: ['caminhoes'] });
  qc.invalidateQueries({ queryKey: ['frota-kpis'] });
  qc.invalidateQueries({ queryKey: ['frota-ranking-custo'] });
  qc.invalidateQueries({ queryKey: ['frota-custo-por-km'] });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type AbastecimentoListItem = {
  id: string; data: string; litros: number; precoLitro: number;
  kmAtual: number; combustivel: string; posto?: string; observacoes?: string;
  kmPercorridos?: number | null; kmL?: number | null;
  caminhao: { id: string; codigo: string; placa: string; modelo: string };
  motorista: { id: string; nome: string } | null;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAbastecimentos(
  page = 1, caminhaoId?: string, dataDe?: string, dataAte?: string,
  search?: string, combustivel?: string, motoristaId?: string,
) {
  return useQuery({
    queryKey: ['abastecimentos', page, caminhaoId, dataDe, dataAte, search, combustivel, motoristaId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (caminhaoId) params.set('caminhaoId', caminhaoId);
      if (dataDe) params.set('dataDe', dataDe);
      if (dataAte) params.set('dataAte', dataAte);
      if (search) params.set('search', search);
      if (combustivel) params.set('combustivel', combustivel);
      if (motoristaId) params.set('motoristaId', motoristaId);
      const { data } = await api.get(`/abastecimentos?${params}`);
      return data as PaginatedResponse<AbastecimentoListItem>;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useRegistrarAbastecimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      caminhaoId: string; motoristaId: string; litros: number;
      precoLitro: number; kmAtual: number; combustivel: string; posto: string; data?: string;
    }) => {
      const { data } = await api.post('/abastecimentos', dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateAbastecimentoBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['caminhao', vars.caminhaoId] });
      queryClient.invalidateQueries({ queryKey: ['abastecimento-ranking-eficiencia'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimento-eficiencia', vars.caminhaoId] });
      toast.success('Abastecimento registrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao registrar abastecimento')); },
  });
}

export function useAtualizarAbastecimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; [key: string]: unknown }) => {
      const { data: res } = await api.put(`/abastecimentos/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      invalidateAbastecimentoBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['caminhao'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimento-ranking-eficiencia'] });
      toast.success('Abastecimento atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar abastecimento')); },
  });
}

export function useRemoverAbastecimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/abastecimentos/${id}`);
    },
    onSuccess: () => {
      invalidateAbastecimentoBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['caminhao'] });
      toast.success('Abastecimento removido!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao remover abastecimento')); },
  });
}
