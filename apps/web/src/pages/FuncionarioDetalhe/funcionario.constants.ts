import { User, Car, Wrench, Shield } from 'lucide-react';

export const cargos = ['motorista', 'mecanico', 'almoxarife', 'gerente', 'administrativo'];

export const cargoLabels: Record<string, string> = {
  motorista: 'Motorista', mecanico: 'Mecânico', almoxarife: 'Almoxarife',
  gerente: 'Gerente', administrativo: 'Administrativo',
};

export const cargoIcons: Record<string, typeof User> = {
  motorista: Car, mecanico: Wrench, almoxarife: Shield,
  gerente: User, administrativo: User,
};

export const emptyEditForm = {
  nome: '', cpf: '', cargo: 'motorista', cnhCategoria: '', cnhValidade: '', telefone: '', email: '',
};

export function cnhStatus(validade?: string | null): 'ok' | 'vencendo' | 'vencida' | null {
  if (!validade) return null;
  const diff = (new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'vencida';
  if (diff < 30) return 'vencendo';
  return 'ok';
}
