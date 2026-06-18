import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrdemServicoListItem = {
  id: string; codigo: string; tipo: string; status: string; prioridade: string;
  dataAbertura: string; dataPrevisao: string | null; dataConclusao: string | null;
  descricao?: string; observacoes?: string | null; custoTotal?: number | null;
  caminhao: { id: string; codigo: string; placa: string; modelo: string };
  responsavel: { id: string; nome: string } | null;
};

export type OSItemDetalhe = {
  id: string; tipo: string; quantidade: number; precoUnitario: number;
  descricao?: string;
  material?: { id: string; nome: string; codigo?: string; unidadeMedida: string } | null;
};

export type OSHistoricoItem = {
  id: string; statusAnterior: string | null; statusNovo: string;
  usuarioNome: string; observacao: string | null; createdAt: string;
};

export type OrdemServicoDetalhe = {
  id: string; codigo: string; tipo: string; status: string; prioridade: string;
  dataAbertura: string; dataPrevisao: string; dataConclusao?: string | null;
  descricao?: string; observacoes?: string | null;
  caminhao: { id: string; codigo: string; placa: string; modelo: string } | null;
  responsavel: { id: string; nome: string; cargo?: string } | null;
  itens: OSItemDetalhe[];
  historico: OSHistoricoItem[];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useOrdensServico(
  page = 1, status?: string, tipo?: string, perPage = 20,
  dataDe?: string, dataAte?: string, search?: string, caminhaoId?: string,
  prioridade?: string, atrasadas?: boolean, responsavelId?: string,
) {
  return useQuery({
    queryKey: ['ordens-servico', page, status, tipo, perPage, dataDe, dataAte, search, caminhaoId, prioridade, atrasadas, responsavelId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (status) params.set('status', status);
      if (tipo) params.set('tipo', tipo);
      if (dataDe) params.set('dataDe', dataDe);
      if (dataAte) params.set('dataAte', dataAte);
      if (search) params.set('search', search);
      if (caminhaoId) params.set('caminhaoId', caminhaoId);
      if (prioridade) params.set('prioridade', prioridade);
      if (atrasadas) params.set('atrasada', '1');
      if (responsavelId) params.set('responsavelId', responsavelId);
      const { data } = await api.get(`/ordens-servico?${params}`);
      return data as PaginatedResponse<OrdemServicoListItem>;
    },
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60 * 2,
  });
}

export function useOrdemServicoDetalhe(id: string) {
  return useQuery({
    queryKey: ['ordem-servico', id],
    queryFn: async () => {
      const { data } = await api.get(`/ordens-servico/${id}`);
      return data.data as OrdemServicoDetalhe;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useAtualizarStatusOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, observacoes }: { id: string; status: string; observacoes?: string }) => {
      const { data } = await api.patch(`/ordens-servico/${id}/status`, { status, observacoes });
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordem-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['caminhoes'] });
      queryClient.invalidateQueries({ queryKey: ['frota-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['os-por-mecanico'] });
      queryClient.invalidateQueries({ queryKey: ['os-tendencia-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['os-custo-por-caminhao'] });
      queryClient.invalidateQueries({ queryKey: ['frota-ranking-custo'] });
      queryClient.invalidateQueries({ queryKey: ['frota-custo-por-km'] });
      queryClient.invalidateQueries({ queryKey: ['manutencao-vencendo'] });
      queryClient.invalidateQueries({ queryKey: ['frota-proximos-manutencao-km'] });
      const osCache = queryClient.getQueryData<OrdemServicoDetalhe>(['ordem-servico', vars.id]);
      if (osCache?.caminhao?.id) {
        queryClient.invalidateQueries({ queryKey: ['caminhao', osCache.caminhao.id] });
        queryClient.invalidateQueries({ queryKey: ['caminhao-timeline', osCache.caminhao.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Status atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar status')); },
  });
}

export function useCriarOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      caminhaoId: string; tipo: string; descricao: string;
      prioridade: string; responsavelId: string; dataPrevisao: string; observacoes?: string;
      criarComoOrcamento?: boolean;
    }) => {
      const { data } = await api.post('/ordens-servico', dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['caminhoes'] });
      queryClient.invalidateQueries({ queryKey: ['frota-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['os-por-mecanico'] });
      queryClient.invalidateQueries({ queryKey: ['os-tendencia-mensal'] });
      queryClient.invalidateQueries({ queryKey: ['funcionario', vars.responsavelId] });
      queryClient.invalidateQueries({ queryKey: ['caminhao', vars.caminhaoId] });
      queryClient.invalidateQueries({ queryKey: ['caminhao-timeline', vars.caminhaoId] });
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Ordem de serviço criada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao criar OS')); },
  });
}

export function useAtualizarOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: {
      id: string; descricao?: string; prioridade?: string;
      responsavelId?: string; dataPrevisao?: string; observacoes?: string | null;
    }) => {
      const { data } = await api.patch(`/ordens-servico/${id}`, dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ordem-servico', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-kpis'] });
      if (vars.responsavelId) {
        queryClient.invalidateQueries({ queryKey: ['funcionario'] });
        queryClient.invalidateQueries({ queryKey: ['os-por-mecanico'] });
      }
      const osCache = queryClient.getQueryData<OrdemServicoDetalhe>(['ordem-servico', vars.id]);
      if (osCache?.caminhao?.id) {
        queryClient.invalidateQueries({ queryKey: ['caminhao', osCache.caminhao.id] });
      }
      if (vars.dataPrevisao) {
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      }
      toast.success('OS atualizada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar OS')); },
  });
}

export function useAdicionarItemOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...item }: {
      id: string; materialId?: string; quantidade: number;
      precoUnitario: number; tipo: string; descricao?: string;
    }) => {
      const { data } = await api.post(`/ordens-servico/${id}/itens`, item);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ordem-servico', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-kpis'] });
      toast.success('Item adicionado à OS!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao adicionar item')); },
  });
}

export function useRemoverItemOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ osId, itemId }: { osId: string; itemId: string }) => {
      const { data } = await api.delete(`/ordens-servico/${osId}/itens/${itemId}`);
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['ordem-servico', vars.osId] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-kpis'] });
      toast.success('Item removido!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao remover item')); },
  });
}

export function useDuplicarOS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/ordens-servico/${id}/duplicar`);
      return data.data as OrdemServicoDetalhe;
    },
    onSuccess: (nova) => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['ordens-servico-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['caminhao', nova.caminhao.id] });
      queryClient.invalidateQueries({ queryKey: ['caminhao-timeline', nova.caminhao.id] });
      toast.success(`OS duplicada → ${nova.codigo}`);
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao duplicar OS')); },
  });
}
