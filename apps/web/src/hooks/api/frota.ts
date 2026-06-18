import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError, type PaginatedResponse } from './_shared';

function invalidateFrotaBase(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['caminhoes'] });
  qc.invalidateQueries({ queryKey: ['frota-kpis'] });
  qc.invalidateQueries({ queryKey: ['manutencao-vencendo'] });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type CaminhaoListItem = {
  id: string; codigo: string; placa: string; modelo: string;
  fabricante: string; anoFabricacao: number; kmAtual: number;
  status: string; proximaManutencao: string | null; proximaManutencaoKm?: number | null;
  vencimentoCrlv?: string | null; vencimentoSeguro?: string | null; numeroSeguro?: string | null;
  motorista: { id: string; nome: string; cnhCategoria?: string; telefone?: string } | null;
  _count: { ordensServico: number; abastecimentos: number };
};

export type CaminhaoCustos = {
  totalOS: number; custoTotalOS: number; totalAbastecimentos: number;
  litrosTotais: number; custoTotalCombustivel: number; custoTotal: number;
};

export type CaminhaoDetalhe = {
  id: string; codigo: string; placa: string; modelo: string;
  fabricante: string; anoFabricacao: number; kmAtual: number;
  status: string; proximaManutencao?: string | null; proximaManutencaoKm?: number | null; chassi?: string;
  vencimentoCrlv?: string | null; vencimentoSeguro?: string | null; numeroSeguro?: string | null;
  motorista?: { id: string; nome: string; cnhCategoria?: string; telefone?: string } | null;
  ordensServico: {
    id: string; codigo: string; tipo: string; status: string; dataAbertura: string;
    responsavel?: { id: string; nome: string } | null;
  }[];
  abastecimentos: {
    id: string; litros: number; posto?: string; precoLitro: number;
    kmAtual: number; data: string;
    motorista?: { id: string; nome: string } | null;
  }[];
  kmRegistros: { id: string; km: number; data: string }[];
  custos?: CaminhaoCustos;
};

export type TimelineEvent = {
  id: string; tipo: string; data: string; titulo: string;
  subtitulo?: string; status?: string; custo?: number | null;
  meta?: Record<string, unknown>;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useCaminhoes(page = 1, status?: string, search?: string, perPage = 20, manutencaoVencida?: boolean) {
  return useQuery({
    queryKey: ['caminhoes', page, status, search, perPage, manutencaoVencida],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      if (manutencaoVencida) params.set('manutencao', '1');
      const { data } = await api.get(`/frota/caminhoes?${params}`);
      return data as PaginatedResponse<CaminhaoListItem>;
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useCaminhaoDetalhe(id: string) {
  return useQuery({
    queryKey: ['caminhao', id],
    queryFn: async () => {
      const { data } = await api.get(`/frota/caminhoes/${id}`);
      return data.data as CaminhaoDetalhe;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
}

export function useCaminhaoTimeline(caminhaoId: string | undefined) {
  return useQuery({
    queryKey: ['caminhao-timeline', caminhaoId],
    queryFn: async () => {
      const { data } = await api.get(`/frota/caminhoes/${caminhaoId}/timeline`);
      return data.data as TimelineEvent[];
    },
    enabled: !!caminhaoId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarCaminhao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      placa: string; chassi: string; modelo: string; fabricante: string;
      anoFabricacao: number; kmAtual: number; motoristaId?: string | null;
      proximaManutencao?: string | null;
    }) => {
      const { data } = await api.post('/frota/caminhoes', dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateFrotaBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['frota-proximos-manutencao-km'] });
      if (vars.motoristaId) {
        queryClient.invalidateQueries({ queryKey: ['funcionario', vars.motoristaId] });
        queryClient.invalidateQueries({ queryKey: ['motoristas-disponiveis'] });
      }
      if (vars.proximaManutencao) {
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      }
      toast.success('Caminhão cadastrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao cadastrar caminhão')); },
  });
}

export function useAtualizarCaminhao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...dados }: { id: string; [key: string]: unknown }) => {
      const { data } = await api.put(`/frota/caminhoes/${id}`, dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateFrotaBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['caminhao', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['documentos-vencendo'] });
      if ('motoristaId' in vars) {
        queryClient.invalidateQueries({ queryKey: ['funcionario'] });
        queryClient.invalidateQueries({ queryKey: ['motoristas-disponiveis'] });
      }
      if ('proximaManutencao' in vars) {
        queryClient.invalidateQueries({ queryKey: ['agenda'] });
      }
      if ('proximaManutencaoKm' in vars) {
        queryClient.invalidateQueries({ queryKey: ['frota-proximos-manutencao-km'] });
      }
      toast.success('Caminhão atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar caminhão')); },
  });
}

export function useAtualizarStatusCaminhao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data } = await api.patch(`/frota/caminhoes/${id}/status`, { status });
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidateFrotaBase(queryClient);
      queryClient.invalidateQueries({ queryKey: ['caminhao', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['motoristas-disponiveis'] });
      toast.success('Status do caminhão atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar status')); },
  });
}

export function useRegistrarKm() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, km }: { id: string; km: number }) => {
      const { data } = await api.post(`/frota/caminhoes/${id}/km`, { km });
      return data;
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ['caminhao', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['caminhoes'] });
      queryClient.invalidateQueries({ queryKey: ['frota-ranking-custo'] });
      queryClient.invalidateQueries({ queryKey: ['frota-custo-por-km'] });
      queryClient.invalidateQueries({ queryKey: ['caminhao-timeline', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['pneus-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['pneus-alertas'] });
      queryClient.invalidateQueries({ queryKey: ['abastecimento-eficiencia', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['frota-proximos-manutencao-km'] });
      toast.success('KM registrado!');
      if (result?.data?.manutencaoNecessariaKm) {
        toast(`⚠️ Caminhão atingiu o km de manutenção programada. Crie uma OS preventiva.`, {
          duration: 8000, icon: '🔧',
        });
      }
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao registrar KM')); },
  });
}
