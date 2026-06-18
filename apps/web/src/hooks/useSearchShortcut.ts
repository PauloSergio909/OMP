import { useEffect, useRef, type RefObject } from 'react';

export function useSearchShortcut(inputRef: RefObject<HTMLInputElement>, onClear?: () => void) {
  const onClearRef = useRef(onClear);
  onClearRef.current = onClear;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const isSlash = e.key === '/';
      const isCtrlK = e.key === 'k' && (e.ctrlKey || e.metaKey);
      if (!isSlash && !isCtrlK) return;

      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [inputRef]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (input!.value && onClearRef.current) {
        e.stopPropagation();
        onClearRef.current();
      } else {
        input!.blur();
      }
    }

    input.addEventListener('keydown', handleEscape);
    return () => input.removeEventListener('keydown', handleEscape);
  }, [inputRef]);
}
