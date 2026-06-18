// ══════════════════════════════════════════════════════════════
// HOOKS CUSTOMIZADOS — Encapsula chamadas à API
// ══════════════════════════════════════════════════════════════
//
// TANSTACK QUERY (antigo React Query) faz o seguinte automaticamente:
// 1. Cache: se os dados já foram buscados, mostra do cache enquanto revalida
// 2. Refetch: recarrega dados em background quando você volta pra aba
// 3. Loading/Error: gerencia estados de carregamento e erro
// 4. Invalidação: quando você cria/edita algo, invalida o cache relacionado
//
// COMO USAR:
// const { data, isLoading, error } = useEstoque();

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import toast from 'react-hot-toast';

// ─── ESTOQUE ─────────────────────────────────────────────────

/** Busca lista de materiais com paginação */
export function useMateriais(page = 1, search = '', categoriaId?: string) {
  return useQuery({
    // queryKey: identificador único do cache.
    // Se page ou search mudar, faz nova requisição.
    queryKey: ['materiais', page, search, categoriaId],

    // queryFn: função que busca os dados
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (search) params.set('search', search);
      if (categoriaId) params.set('categoriaId', categoriaId);

      const { data } = await api.get(`/estoque/materiais?${params}`);
      return data; // { data: Material[], pagination: {...} }
    },
  });
}

/** Busca KPIs do estoque (dashboard) */
export function useEstoqueKPIs() {
  return useQuery({
    queryKey: ['estoque-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/estoque/kpis');
      return data.data;
    },
    refetchInterval: 1000 * 60 * 2, // Recarrega a cada 2 minutos
  });
}

/** Busca alertas de estoque baixo */
export function useEstoqueAlertas() {
  return useQuery({
    queryKey: ['estoque-alertas'],
    queryFn: async () => {
      const { data } = await api.get('/estoque/alertas');
      return data.data;
    },
  });
}

/** Mutation: registrar entrada de estoque */
export function useRegistrarEntrada() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: {
      materialId: string; quantidade: number; precoUnitario: number; motivo: string;
    }) => {
      const { data } = await api.post('/estoque/entrada', dados);
      return data;
    },
    onSuccess: () => {
      // Invalida o cache → força recarregamento dos dados
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-alertas'] });
      toast.success('Entrada registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao registrar entrada');
    },
  });
}

/** Mutation: registrar saída de estoque */
export function useRegistrarSaida() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: {
      materialId: string; quantidade: number; motivo: string; ordemServicoId?: string;
    }) => {
      const { data } = await api.post('/estoque/saida', dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-alertas'] });
      toast.success('Saída registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao registrar saída');
    },
  });
}

// ─── FROTA ───────────────────────────────────────────────────

/** Busca lista de caminhões */
export function useCaminhoes(page = 1, status?: string) {
  return useQuery({
    queryKey: ['caminhoes', page, status],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (status) params.set('status', status);
      const { data } = await api.get(`/frota/caminhoes?${params}`);
      return data;
    },
  });
}

/** Busca KPIs da frota */
export function useFrotaKPIs() {
  return useQuery({
    queryKey: ['frota-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/frota/kpis');
      return data.data;
    },
  });
}

// ─── ORDENS DE SERVIÇO ───────────────────────────────────────

/** Busca ordens de serviço */
export function useOrdensServico(page = 1, status?: string, tipo?: string) {
  return useQuery({
    queryKey: ['ordens-servico', page, status, tipo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (status) params.set('status', status);
      if (tipo) params.set('tipo', tipo);
      const { data } = await api.get(`/ordens-servico?${params}`);
      return data;
    },
  });
}

/** Mutation: atualizar status de uma OS */
export function useAtualizarStatusOS() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, observacoes }: {
      id: string; status: string; observacoes?: string;
    }) => {
      const { data } = await api.patch(`/ordens-servico/${id}/status`, { status, observacoes });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] });
      queryClient.invalidateQueries({ queryKey: ['caminhoes'] });
      queryClient.invalidateQueries({ queryKey: ['frota-kpis'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erro ao atualizar status');
    },
  });
}
