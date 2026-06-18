import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyTextProps {
  text: string;
  className?: string;
}

export function CopyText({ text, className = '' }: CopyTextProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // silently ignore — clipboard blocked in some iframe/http contexts
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? 'Copiado!' : 'Clique para copiar'}
      className={`group inline-flex items-center gap-1 rounded px-1 -mx-1 hover:bg-blue-50 transition ${className}`}
    >
      {text}
      {copied
        ? <Check size={10} className="flex-shrink-0 text-green-500" />
        : <Copy size={10} className="flex-shrink-0 opacity-0 group-hover:opacity-40 transition" />}
    </button>
  );
}
