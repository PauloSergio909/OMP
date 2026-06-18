import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError } from './_shared';

function invalidatePneusBase(qc: ReturnType<typeof useQueryClient>, caminhaoId: string) {
  qc.invalidateQueries({ queryKey: ['pneus', caminhaoId] });
  qc.invalidateQueries({ queryKey: ['pneus-kpis'] });
  qc.invalidateQueries({ queryKey: ['pneus-alertas'] });
  qc.invalidateQueries({ queryKey: ['caminhao-timeline', caminhaoId] });
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type PneuItem = {
  id: string; codigo: string; posicao: string; marca: string; modelo: string;
  numeroSerie?: string | null; kmInstalacao: number; kmVidaUtil: number;
  dataInstalacao: string; status: string;
  trocas: { id: string; kmTroca: number; motivo: string; custo?: number | null; observacoes?: string | null; createdAt: string }[];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function usePneusCaminhao(caminhaoId: string | undefined) {
  return useQuery({
    queryKey: ['pneus', caminhaoId],
    queryFn: async () => {
      const { data } = await api.get(`/pneus/caminhao/${caminhaoId}`);
      return data.data as PneuItem[];
    },
    enabled: !!caminhaoId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarPneu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      caminhaoId: string; posicao: string; marca: string; modelo: string;
      numeroSerie?: string; kmInstalacao: number; kmVidaUtil?: number;
    }) => {
      const { data } = await api.post('/pneus', dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidatePneusBase(queryClient, vars.caminhaoId);
      toast.success('Pneu cadastrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao cadastrar pneu')); },
  });
}

export function useRegistrarTrocaPneu() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, caminhaoId, ...dados }: {
      id: string; caminhaoId: string; kmTroca: number; motivo: string;
      custo?: number; observacoes?: string;
      novoPneu?: { posicao: string; marca: string; modelo: string; numeroSerie?: string; kmInstalacao: number; kmVidaUtil?: number };
    }) => {
      const { data } = await api.post(`/pneus/${id}/troca`, dados);
      return data;
    },
    onSuccess: (_data, vars) => {
      invalidatePneusBase(queryClient, vars.caminhaoId);
      toast.success('Troca de pneu registrada!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao registrar troca')); },
  });
}
