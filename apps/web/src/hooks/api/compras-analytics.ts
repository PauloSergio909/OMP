import { useQuery } from '@tanstack/react-query';
import { api } from './_shared';

export type ComprasKPIs = {
  pendentes: number; aprovadas: number; recebidas: number;
  canceladas: number; atrasadas: number; valorEmAberto: number;
};

export function useComprasKPIs() {
  return useQuery({
    queryKey: ['compras-kpis'],
    queryFn: async () => {
      const { data } = await api.get('/compras/kpis');
      return data.data as ComprasKPIs;
    },
    staleTime: 1000 * 60 * 5,
  });
}
