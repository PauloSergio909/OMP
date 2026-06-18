import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // O scroll real é no <main> (overflow-y-auto), não no window.
    // window.scrollTo() não tem efeito aqui porque o wrapper tem overflow-hidden.
    document.querySelector('main')?.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
