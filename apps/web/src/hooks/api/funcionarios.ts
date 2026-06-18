import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

function invalidateFuncionariosBase(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['funcionarios'] });
  qc.invalidateQueries({ queryKey: ['funcionarios-kpis'] });
  qc.invalidateQueries({ queryKey: ['motoristas-disponiveis'] });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type FuncionarioListItem = {
  id: string; nome: string; cpf: string; cargo: string;
  telefone: string; email?: string; ativo: boolean;
  cnhCategoria?: string; cnhValidade?: string; dataAdmissao?: string;
  user?: { id: string; role: string; email: string } | null;
  _count?: { caminhoesMotorista: number; ordensResponsavel: number };
};

export type FuncionarioDetalhe = {
  id: string; nome: string; cpf: string; cargo: string;
  telefone: string; email?: string; ativo: boolean;
  cnhCategoria?: string; cnhValidade?: string; dataAdmissao?: string;
  user: { id: string; role: string; email: string } | null;
  _count?: { ordensResponsavel: number };
  caminhoesMotorista: { id: string; codigo: string; placa: string; modelo: string; status: string }[];
  ordensResponsavel: {
    id: string; codigo: string; tipo: string; status: string; dataAbertura: string;
    caminhao: { id: string; codigo: string } | null;
  }[];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useFuncionarios(page = 1, search = '', cargo?: string, ativo?: boolean, perPage = 20, cnhAlerta?: boolean) {
  return useQuery({
    queryKey: ['funcionarios', page, search, cargo, ativo, perPage, cnhAlerta],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (search) params.set('search', search);
      if (cargo) params.set('cargo', cargo);
      if (ativo !== undefined) params.set('ativo', String(ativo));
      if (cnhAlerta) params.set('cnh', '1');
      const { data } = await api.get(`/funcionarios?${params}`);
      return data as PaginatedResponse<FuncionarioListItem>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useFuncionario(id: string) {
  return useQuery({
    queryKey: ['funcionario', id],
    queryFn: async () => {
      const { data } = await api.get(`/funcionarios/${id}`);
      return data.data as FuncionarioDetalhe;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      nome: string; cpf: string; cargo: string; telefone: string; email: string;
      cnhCategoria?: string; cnhValidade?: string;
    }) => {
      const { data } = await api.post('/funcionarios', dados);
      return data;
    },
    onSuccess: () => {
      invalidateFuncionariosBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['cnh-vencendo'] });
      toast.success('Funcionário cadastrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao cadastrar funcionário')); },
  });
}

export function useAtualizarFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; [key: string]: unknown }) => {
      const { data } = await api.put(`/funcionarios/${id}`, dados);
      return data;
    },
    onSuccess: () => {
      invalidateFuncionariosBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['funcionario'] });
      queryClient.invalidateQueries({ queryKey: ['cnh-vencendo'] });
      toast.success('Funcionário atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar funcionário')); },
  });
}

export function useToggleAtivoFuncionario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data } = await api.patch(`/funcionarios/${id}/status`, { ativo });
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateFuncionariosBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['funcionario', vars.id] });
      toast.success(vars.ativo ? 'Funcionário reativado!' : 'Funcionário desativado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Sem permissão para alterar o status do funcionário')); },
  });
}
