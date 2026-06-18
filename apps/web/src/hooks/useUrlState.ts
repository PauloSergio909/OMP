import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Estado sincronizado com URLSearchParams.
 * Permite bookmarking e navegação back/forward preservando filtros.
 * Usa replace:true para não poluir o histórico a cada keystroke.
 */
export function useUrlState(
  key: string,
  defaultValue: string,
): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (!newValue || newValue === defaultValue) {
            next.delete(key);
          } else {
            next.set(key, newValue);
          }
          return next;
        },
        { replace: true },
      );
    },
    [key, defaultValue, setSearchParams],
  );

  return [value, setValue];
}

/** Estado de ordenação de tabela sincronizado com URL (sort + dir). */
export function useSortState() {
  const [sortField, setSortField] = useUrlState('sort', '');
  const [sortDir, setSortDir] = useUrlState('dir', 'asc');

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  return { sortField, sortDir, toggleSort };
}

/** Variante numérica para paginação. Página 1 não aparece na URL (URL limpa). */
export function useUrlPageState(): [number, (value: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('page');
  const value = raw ? Math.max(1, Number(raw) || 1) : 1;

  const setValue = useCallback(
    (newValue: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newValue <= 1) {
            next.delete('page');
          } else {
            next.set('page', String(newValue));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [value, setValue];
}
