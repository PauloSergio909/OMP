import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

export type FornecedorListItem = {
  id: string; razaoSocial: string; cnpj: string;
  telefone: string; email: string; ativo: boolean; endereco?: string;
  avaliacao?: number;
};

export type CategoriaItem = { id: string; nome: string; descricao?: string };

export type FornecedorDropdownItem = { id: string; razaoSocial: string; cnpj: string; avaliacao?: number };

export function useCategorias() {
  return useQuery({
    queryKey: ['categorias'],
    queryFn: async () => {
      const { data } = await api.get('/estoque/categorias');
      return data.data as CategoriaItem[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useFornecedores() {
  return useQuery({
    queryKey: ['fornecedores'],
    queryFn: async () => {
      const { data } = await api.get('/estoque/fornecedores');
      return data.data as FornecedorDropdownItem[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useFornecedoresPaginado(page = 1, search = '') {
  return useQuery({
    queryKey: ['fornecedores-paginado', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (search) params.set('search', search);
      const { data } = await api.get(`/estoque/fornecedores?${params}`);
      return data as PaginatedResponse<FornecedorListItem>;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useCriarFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { razaoSocial: string; cnpj: string; telefone: string; email: string; endereco?: string }) => {
      const { data } = await api.post('/estoque/fornecedores', dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      queryClient.invalidateQueries({ queryKey: ['fornecedores-paginado'] });
      toast.success('Fornecedor cadastrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao cadastrar fornecedor')); },
  });
}

export function useAtualizarFornecedor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; razaoSocial?: string; telefone?: string; email?: string; endereco?: string | null; ativo?: boolean }) => {
      const { data } = await api.patch(`/estoque/fornecedores/${id}`, dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      queryClient.invalidateQueries({ queryKey: ['fornecedores-paginado'] });
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
      queryClient.invalidateQueries({ queryKey: ['material'] });
      toast.success('Fornecedor atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar fornecedor')); },
  });
}

export function useCriarCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { nome: string; descricao?: string }) => {
      const { data } = await api.post('/estoque/categorias', dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      toast.success('Categoria criada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao criar categoria')); },
  });
}

export function useAtualizarCategoria() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; nome?: string; descricao?: string | null }) => {
      const { data } = await api.patch(`/estoque/categorias/${id}`, dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categorias'] });
      queryClient.invalidateQueries({ queryKey: ['materiais'] });
      queryClient.invalidateQueries({ queryKey: ['material'] });
      toast.success('Categoria atualizada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar categoria')); },
  });
}
