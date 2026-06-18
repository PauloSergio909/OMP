import { useEffect, useRef } from 'react';

export function useNewShortcut(onNew: () => void) {
  const onNewRef = useRef(onNew);
  onNewRef.current = onNew;

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Don't open a second modal if one is already visible
      if (document.querySelector('[role="dialog"]')) return;

      e.preventDefault();
      onNewRef.current();
    }

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}

 
