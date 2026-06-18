import { useState } from 'react';
import { validarCpf, validarCnpj } from '@fleetmaster/shared';

type Rules<T> = Partial<Record<keyof T, (val: unknown, form: T) => string | undefined>>;

export function useFormValidation<T extends Record<string, unknown>>(rules: Rules<T>) {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  function validate(form: T): boolean {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let valid = true;

    for (const key in rules) {
      const rule = rules[key];
      if (!rule) continue;
      const msg = rule(form[key], form);
      if (msg) {
        newErrors[key] = msg;
        valid = false;
      }
    }

    setErrors(newErrors);
    return valid;
  }

  function validateField(key: keyof T, form: T) {
    const rule = rules[key];
    if (!rule) return;
    const msg = rule(form[key], form);
    setErrors((prev) => {
      const next = { ...prev };
      if (msg) {
        next[key] = msg;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  function clearError(field: keyof T) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function clearAll() {
    setErrors({});
  }

  return { errors, validate, validateField, clearError, clearAll };
}

// ─── Regras comuns ────────────────────────────────────────────

export const required = (label: string) => (val: unknown) =>
  !val || String(val).trim() === '' ? `${label} é obrigatório` : undefined;

export const minLength = (min: number, label: string) => (val: unknown) =>
  typeof val === 'string' && val.trim().length < min ? `${label} deve ter pelo menos ${min} caracteres` : undefined;

export const isEmail = (label = 'E-mail') => (val: unknown) =>
  typeof val === 'string' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) ? `${label} inválido` : undefined;

export const isPositive = (label: string) => (val: unknown) =>
  val !== '' && Number(val) <= 0 ? `${label} deve ser maior que zero` : undefined;

export const combine = (...fns: Array<(val: unknown, form?: unknown) => string | undefined>) =>
  (val: unknown, form: unknown) => fns.reduce<string | undefined>((err, fn) => err ?? fn(val, form), undefined);

// Valida regex — passa em vazio (use combine com required para campos obrigatórios)
export const matches = (regex: RegExp, message: string) => (val: unknown) =>
  typeof val === 'string' && val && !regex.test(val) ? message : undefined;

// Valida comprimento exato — passa em vazio
export const exactLength = (n: number, message: string) => (val: unknown) =>
  typeof val === 'string' && val.length > 0 && val.length !== n ? message : undefined;

// Valida intervalo numérico — passa em vazio (use combine com required para campos obrigatórios)
export const inRange = (min: number, max: number, label: string) => (val: unknown) => {
  if (val === '' || val === null || val === undefined) return undefined;
  const n = Number(val);
  if (Number.isNaN(n) || n < min || n > max) return `${label} deve estar entre ${min} e ${max}`;
  return undefined;
};

// Valida que a data não é anterior a hoje (mesmo critério do backend: toDateString() normaliza para meia-noite)
// Passa em vazio — use combine com required para campos obrigatórios
export const isNotPastDate = (label = 'Data') => (val: unknown) => {
  if (typeof val !== 'string' || !val) return undefined;
  const d = new Date(val);
  if (isNaN(d.getTime())) return `${label} inválida`;
  const today = new Date(new Date().toDateString()); // meia-noite local
  return d < today ? `${label} não pode ser no passado` : undefined;
};

// Valida CPF (formato + dígitos verificadores) — passa em vazio
export const isCpf = () => (val: unknown) => {
  if (typeof val !== 'string' || !val) return undefined;
  const digits = val.replace(/\D/g, '');
  if (digits.length < 11) return 'CPF inválido';
  return validarCpf(val) ? undefined : 'CPF inválido';
};

// Valida CNPJ (formato + dígitos verificadores) — passa em vazio
export const isCnpj = () => (val: unknown) => {
  if (typeof val !== 'string' || !val) return undefined;
  const digits = val.replace(/\D/g, '');
  if (digits.length < 14) return 'CNPJ inválido';
  return validarCnpj(val) ? undefined : 'CNPJ inválido';
};

