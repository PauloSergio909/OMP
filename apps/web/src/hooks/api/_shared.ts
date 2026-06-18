import { api } from '../../services/api';
import toast from 'react-hot-toast';

export { api, toast };

export function apiError(error: unknown, fallback: string): string {
  const resp = (error as { response?: { data?: { details?: { mensagem: string }[]; error?: string } } })?.response?.data;
  if (resp?.details?.[0]?.mensagem) return resp.details[0].mensagem;
  if (resp?.error && resp.error !== 'Dados inválidos') return resp.error;
  return fallback;
}

export type PaginatedResponse<T> = {
  data: T[];
  pagination: { page: number; perPage: number; total: number; totalPages: number };
};
