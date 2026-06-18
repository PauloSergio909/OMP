import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export type CompraListItem = {
  id: string; codigo: string; status: string;
  dataPedido: string; dataEntrega?: string | null;
  valorTotal: number; observacoes?: string | null;
  fornecedor: { id: string; razaoSocial: string; cnpj: string };
  itens: Array<{
    id: string; materialId: string; quantidade: number; precoUnitario: number;
    material: { id: string; nome: string; codigo: string; unidadeMedida: string };
  }>;
};

export type CompraDetalhe = {
  id: string; codigo: string; status: string;
  dataPedido: string; dataEntrega?: string | null; dataRecebimento?: string | null;
  valorTotal: number; observacoes?: string | null;
  fornecedor: { id: string; razaoSocial: string; cnpj?: string; telefone?: string; email?: string; endereco?: string };
  itens: CompraListItem['itens'];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCompras(page = 1, status?: string, search?: string, de?: string, ate?: string, atrasada?: boolean) {
  return useQuery({
    queryKey: ['compras', page, status, search, de, ate, atrasada],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (de) params.set('de', de);
      if (ate) params.set('ate', ate);
      if (atrasada) params.set('atrasada', '1');
      const { data } = await api.get(`/compras?${params}`);
      return data as PaginatedResponse<CompraListItem>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCompraDetalhe(id: string) {
  return useQuery({
    queryKey: ['compra', id],
    queryFn: async () => {
      const { data } = await api.get(`/compras/${id}`);
      return data.data as CompraDetalhe;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCriarCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      fornecedorId: string; dataEntrega?: string; observacoes?: string;
      itens: { materialId: string; quantidade: number; precoUnitario: number }[];
    }) => {
      const { data } = await api.post('/compras', dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['compras-kpis'] });
      toast.success('Ordem de compra criada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao criar ordem de compra')); },
  });
}

export function useAtualizarStatusCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/compras/${id}/status`, { status });
      return data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['compras-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['compra', vars.id] });
      if (vars.status === 'recebida') {
        queryClient.invalidateQueries({ queryKey: ['materiais'] });
        queryClient.invalidateQueries({ queryKey: ['material'] });
        queryClient.invalidateQueries({ queryKey: ['estoque-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['estoque-alertas'] });
        queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
        toast.success('OC recebida! Estoque atualizado automaticamente.');
      } else {
        toast.success('Status da OC atualizado!');
      }
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar status')); },
  });
}

export function useAtualizarCompra() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; dataEntrega?: string | null; observacoes?: string | null }) => {
      const { data: res } = await api.put(`/compras/${id}`, dados);
      return res.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      queryClient.invalidateQueries({ queryKey: ['compras-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['compra', vars.id] });
      toast.success('OC atualizada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar OC')); },
  });
}

export function useAdicionarItemOC() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ocId, materialId, quantidade, precoUnitario }: {
      ocId: string; materialId: string; quantidade: number; precoUnitario: number;
    }) => {
      const { data } = await api.post(`/compras/${ocId}/itens`, { materialId, quantidade, precoUnitario });
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['compra', vars.ocId] });
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      toast.success('Item adicionado à OC!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao adicionar item')); },
  });
}

export function useRemoverItemOC() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ocId, itemId }: { ocId: string; itemId: string }) => {
      await api.delete(`/compras/${ocId}/itens/${itemId}`);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['compra', vars.ocId] });
      queryClient.invalidateQueries({ queryKey: ['compras'] });
      toast.success('Item removido!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao remover item')); },
  });
}
