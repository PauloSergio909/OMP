import { useState, useEffect } from 'react';
import { Keyboard } from 'lucide-react';
import { Modal } from '../ui/Modal';

const groups = [
  {
    label: 'Navegação',
    items: [
      { keys: ['Ctrl K'],    description: 'Busca global (caminhão, OS, material…)' },
      { keys: ['/'],         description: 'Focar campo de busca da página atual' },
      { keys: ['Esc'],       description: 'Fechar busca global · limpar campo · desfocar' },
      { keys: ['N'],         description: 'Abrir formulário de criação' },
      { keys: ['?'],         description: 'Exibir esta ajuda' },
    ],
  },
  {
    label: 'Dentro de modais',
    items: [
      { keys: ['Ctrl ↵'],    description: 'Confirmar / Salvar' },
      { keys: ['Esc'],       description: 'Fechar modal' },
      { keys: ['Tab'],       description: 'Próximo campo' },
      { keys: ['Shift Tab'], description: 'Campo anterior' },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center px-2 py-0.5 rounded border border-gray-300 bg-gray-100 font-mono text-xs text-gray-700 shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key !== '?' || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs.length > 0 && !open) return;
      e.preventDefault();
      setOpen((v) => !v);
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Atalhos de teclado (?)"
        className="fixed bottom-5 right-5 z-30 w-8 h-8 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:shadow-lg transition print:hidden"
      >
        <Keyboard size={15} />
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Atalhos de teclado" size="sm">
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ keys, description }) => (
                  <div key={description} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{description}</span>
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      {keys.map((k, i) => (
                        <span key={k} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-gray-400">ou</span>}
                          <Kbd>{k}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
