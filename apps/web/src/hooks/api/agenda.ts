import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, toast, apiError } from './_shared';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EventoAgenda = {
  id: string;
  tipo: 'manutencao' | 'os' | 'manual';
  data: string;
  titulo: string;
  subtitulo: string;
  cor: string;
  link: string | null;
  editavel: boolean;
  tipoEvento?: string;
  descricao?: string | null;
};

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useAgendaMes(mes: string) {
  return useQuery({
    queryKey: ['agenda', mes],
    queryFn: async () => {
      const { data } = await api.get(`/agenda?mes=${mes}`);
      return data.data as { mes: string; eventos: EventoAgenda[] };
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCriarEventoAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      titulo: string; descricao?: string; data: string;
      tipo?: string; cor?: string; link?: string;
    }) => {
      const { data: res } = await api.post('/agenda', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Evento criado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao criar evento')); },
  });
}

export function useAtualizarEventoAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: {
      id: string; titulo?: string; descricao?: string | null;
      data?: string; tipo?: string; cor?: string; link?: string | null;
    }) => {
      const { data: res } = await api.put(`/agenda/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Evento atualizado!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao atualizar evento')); },
  });
}

export function useRemoverEventoAgenda() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/agenda/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agenda'] });
      toast.success('Evento removido!');
    },
    onError: (error: unknown) => { toast.error(apiError(error, 'Erro ao remover evento')); },
  });
}
