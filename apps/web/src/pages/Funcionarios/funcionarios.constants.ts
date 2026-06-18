import { Car, Wrench, Shield, Users } from 'lucide-react';

export const cargos = ['motorista', 'mecanico', 'almoxarife', 'gerente', 'administrativo'];

export const cargoLabels: Record<string, string> = {
  motorista: 'Motorista', mecanico: 'Mecânico', almoxarife: 'Almoxarife',
  gerente: 'Gerente', administrativo: 'Administrativo',
};

export const cargoIcons: Record<string, typeof Car> = {
  motorista: Car, mecanico: Wrench, almoxarife: Shield,
  gerente: Users, administrativo: Users,
};

export const emptyFuncionarioForm = {
  nome: '', cpf: '', cargo: 'motorista', cnhCategoria: '',
  cnhValidade: '', telefone: '', email: '',
};

export function cnhAlert(validade?: string | null): 'vencida' | 'vencendo' | null {
  if (!validade) return null;
  const diff = (new Date(validade).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'vencida';
  if (diff < 30) return 'vencendo';
  return null;
}
