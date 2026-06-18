import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

function invalidateEstoqueBase(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['materiais'] });
  qc.invalidateQueries({ queryKey: ['estoque-kpis'] });
  qc.invalidateQueries({ queryKey: ['estoque-alertas'] });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type MaterialListItem = {
  id: string; codigo: string; nome: string; unidadeMedida: string;
  precoUnitario: number; estoqueMinimo: number; estoqueMaximo: number; ativo: boolean;
  categoriaId: string; fornecedorId: string;
  categoria?: { id: string; nome: string } | null;
  fornecedor?: { id: string; razaoSocial: string } | null;
  estoques: { quantidade: number; ultimaAtualizacao: string; localizacao?: string | null }[];
};

export type MovimentacaoListItem = {
  id: string; tipo: string; quantidade: number; precoUnitario: number; motivo: string; createdAt: string;
  material: { id: string; nome: string; codigo: string; unidadeMedida: string };
  usuario: { id: string; nome: string } | null;
};

export type MaterialMovimentacaoItem = {
  id: string; tipo: string; quantidade: number; precoUnitario: number;
  motivo: string; createdAt: string;
  usuario: { id: string; nome: string } | null;
};

export type MaterialDetalhe = {
  id: string; codigo: string; nome: string; unidadeMedida: string;
  precoUnitario: number; estoqueMinimo: number; estoqueMaximo: number; ativo: boolean;
  categoria: { id: string; nome: string } | null;
  fornecedor: { id: string; razaoSocial: string; cnpj?: string; telefone?: string; email?: string } | null;
  estoques: { quantidade: number; ultimaAtualizacao: string; localizacao?: string | null }[];
  movimentacoes: MaterialMovimentacaoItem[];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAtualizarLocalizacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ materialId, localizacao }: { materialId: string; localizacao: string | null }) => {
      const { data } = await api.patch(`/estoque/materiais/${materialId}/localizacao`, { localizacao });
      return data.data;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['material', vars.materialId] });
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
      toast.success('Localização atualizada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar localização')); },
  });
}

export function useMaterialDetalhe(id: string) {
  return useQuery({
    queryKey: ['material', id],
    queryFn: async () => {
      const { data } = await api.get(`/estoque/materiais/${id}`);
      return data.data as MaterialDetalhe;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useMateriais(page = 1, search = '', categoriaId?: string, perPage = 20, abaixoMinimo = false, fornecedorId?: string) {
  return useQuery({
    queryKey: ['materiais', page, search, categoriaId, perPage, abaixoMinimo, fornecedorId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (search) params.set('search', search);
      if (categoriaId) params.set('categoriaId', categoriaId);
      if (fornecedorId) params.set('fornecedorId', fornecedorId);
      if (abaixoMinimo) params.set('abaixoMinimo', 'true');
      const { data } = await api.get(`/estoque/materiais?${params}`);
      return data as PaginatedResponse<MaterialListItem>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useRegistrarEntrada() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { materialId: string; quantidade: number; precoUnitario: number; motivo: string }) => {
      const { data } = await api.post('/estoque/entrada', dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateEstoqueBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['material', vars.materialId] });
      toast.success('Entrada registrada com sucesso!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao registrar entrada')); },
  });
}

export function useRegistrarSaida() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { materialId: string; quantidade: number; motivo: string; ordemServicoId?: string }) => {
      const { data } = await api.post('/estoque/saida', dados);
      return data;
    },
    onSuccess: (result, vars) => {
      invalidateEstoqueBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['material', vars.materialId] });
      if (result?.data?.abaixoMinimo) {
        queryClient.invalidateQueries({ queryKey: ['compras'] });
        queryClient.invalidateQueries({ queryKey: ['compras-kpis'] });
        toast('📦 Saída registrada. OC de reposição criada automaticamente.', { duration: 5000 });
      } else {
        toast.success('Saída registrada com sucesso!');
      }
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao registrar saída')); },
  });
}

export function useCriarMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      nome: string; categoriaId: string; unidadeMedida: string;
      precoUnitario: number; estoqueMinimo: number; estoqueMaximo: number; fornecedorId: string;
    }) => {
      const { data } = await api.post('/estoque/materiais', dados);
      return data;
    },
    onSuccess: () => {
      invalidateEstoqueBase(queryClient);
      toast.success('Material cadastrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao cadastrar material')); },
  });
}

export function useImportarMateriais() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      categoriaId: string; fornecedorId: string;
      materiais: { nome: string; unidadeMedida: string; precoUnitario: number; estoqueMinimo: number; estoqueMaximo: number }[];
    }) => {
      const { data } = await api.post('/estoque/materiais/importar', dados);
      return data.data as { criados: number; erros: { nome: string; mensagem: string }[] };
    },
    onSuccess: (result) => {
      invalidateEstoqueBase(queryClient);
      toast.success(`${result.criados} material(is) importado(s)${result.erros.length > 0 ? ` (${result.erros.length} erro(s))` : '!'}`);
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao importar materiais')); },
  });
}

export function useAtualizarMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; [key: string]: unknown }) => {
      const { data } = await api.patch(`/estoque/materiais/${id}`, dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateEstoqueBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['material', vars.id] });
      toast.success('Material atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar material')); },
  });
}

export function useMovimentacoesEstoque(page = 1, materialId?: string, tipo?: string) {
  return useQuery({
    queryKey: ['movimentacoes', page, materialId, tipo],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '15' });
      if (materialId) params.set('materialId', materialId);
      if (tipo) params.set('tipo', tipo);
      const { data } = await api.get(`/estoque/movimentacoes?${params}`);
      return data as PaginatedResponse<MovimentacaoListItem>;
    },
    staleTime: 1000 * 60 * 5,
  });
}
