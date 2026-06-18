import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserProfileResult = { id: string; nome: string; email: string; role: string };

export type UsuarioListItem = {
  id: string; nome: string; email: string;
  role: string; ativo: boolean;
  funcionario?: { id: string; nome: string } | null;
};

export type EmpresaData = {
  id: string; razaoSocial: string; cnpj: string;
  telefone: string; email: string; endereco: string; logoUrl: string; updatedAt: string;
};

export type LogAuditoriaItem = {
  id: string; userId: string; userNome: string;
  acao: string; entidade: string; entidadeId: string | null;
  ip: string | null; createdAt: string;
};

export type AdminStats = {
  registros: {
    usuarios: number; funcionarios: number; caminhoes: number; ordensServico: number;
    materiais: number; equipamentos: number; abastecimentos: number; ordensCompra: number;
    logsAuditoria: number; pneus: number;
  };
  infraestrutura: {
    nodeVersion: string; uptimeSegundos: number; memoriaHeapMB: number;
    redisMemoria: string; dbTamanho: string; redisAtivo?: boolean;
  };
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAtualizarPerfil() {
  return useMutation({
    mutationFn: async (dados: { nome: string; email: string }) => {
      const { data } = await api.put('/auth/profile', dados);
      return data.data as UserProfileResult;
    },
    onSuccess: () => { toast.success('Perfil atualizado com sucesso!'); },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar perfil')); },
  });
}

export function useAlterarSenha() {
  return useMutation({
    mutationFn: async (dados: { senhaAtual: string; novaSenha: string; confirmarNovaSenha: string }) => {
      const { data } = await api.put('/auth/password', dados);
      return data;
    },
    onSuccess: () => { toast.success('Senha alterada com sucesso!'); },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao alterar senha')); },
  });
}

export function useUsuarios(page = 1, search = '') {
  return useQuery({
    queryKey: ['usuarios', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (search) params.set('search', search);
      const { data } = await api.get(`/auth/users?${params}`);
      return data as PaginatedResponse<UsuarioListItem>;
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: { nome: string; email: string; senha: string; role: string; funcionarioId?: string }) => {
      const { data } = await api.post('/auth/users', dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Usuário criado com acesso ao sistema!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao criar usuário')); },
  });
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; role?: string; ativo?: boolean; senha?: string }) => {
      const { data } = await api.patch(`/auth/users/${id}`, dados);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['funcionarios'] });
      queryClient.invalidateQueries({ queryKey: ['funcionario'] });
      toast.success('Usuário atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar usuário')); },
  });
}

export function useGetEmpresa() {
  return useQuery({
    queryKey: ['empresa'],
    queryFn: async () => {
      const { data } = await api.get('/configuracoes/empresa');
      return data.data as EmpresaData;
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useUpdateEmpresa() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      razaoSocial: string; cnpj?: string; telefone?: string;
      email?: string; endereco?: string; logoUrl?: string;
    }) => {
      const { data } = await api.put('/configuracoes/empresa', dados);
      return data.data as EmpresaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresa'] });
      toast.success('Dados da empresa salvos!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao salvar dados da empresa')); },
  });
}

export function useLogsAuditoria(page = 1, userId?: string, entidade?: string) {
  return useQuery({
    queryKey: ['logs-auditoria', page, userId, entidade],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: '20' });
      if (userId) params.set('userId', userId);
      if (entidade) params.set('entidade', entidade);
      const { data } = await api.get(`/configuracoes/auditoria?${params}`);
      return data as PaginatedResponse<LogAuditoriaItem>;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/stats');
      return data.data as AdminStats;
    },
    staleTime: 1000 * 60,
    retry: false,
  });
}

export function useFlushCache() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.delete('/admin/cache');
      return data.data as { removidas: number; mensagem: string };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries();
      toast.success(res.mensagem);
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao limpar cache')); },
  });
}
