import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError } from './_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ChecklistItem = { id: string; item: string; ok: boolean; observacoes?: string | null };

export type ChecklistVistoria = {
  id: string; caminhaoId: string; motoristaId: string; kmAtual: number;
  tipo: string; aprovado: boolean; observacoes?: string | null; createdAt: string;
  motorista: { id: string; nome: string } | null;
  itens: ChecklistItem[];
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useChecklistsCaminhao(caminhaoId: string | undefined) {
  return useQuery({
    queryKey: ['checklists', caminhaoId],
    queryFn: async () => {
      const { data } = await api.get(`/checklists/caminhao/${caminhaoId}?limit=10`);
      return data.data as ChecklistVistoria[];
    },
    enabled: !!caminhaoId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useItensPadraoChecklist() {
  return useQuery({
    queryKey: ['checklists-itens-padrao'],
    queryFn: async () => {
      const { data } = await api.get('/checklists/itens-padrao');
      return data.data as string[];
    },
    staleTime: Infinity,
  });
}

export function useCriarChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dados: {
      caminhaoId: string; motoristaId: string; kmAtual: number; tipo: string;
      observacoes?: string; itens: { item: string; ok: boolean; observacoes?: string }[];
    }) => {
      const { data } = await api.post('/checklists', dados);
      return data.data as ChecklistVistoria;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['checklists', vars.caminhaoId] });
      queryClient.invalidateQueries({ queryKey: ['caminhao-timeline', vars.caminhaoId] });
      toast.success('Checklist registrado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao registrar checklist')); },
  });
}
