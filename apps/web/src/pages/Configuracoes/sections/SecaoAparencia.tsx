import { Palette } from 'lucide-react';

export function SecaoAparencia() {
  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Aparência</h2>
      <p className="text-xs text-gray-400 mb-5">Personalize a interface do sistema.</p>
      <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-gray-200 bg-gray-50">
        <Palette size={20} className="text-gray-300" />
        <p className="text-sm text-gray-400">Temas e personalização visual — em breve.</p>
      </div>
    </div>
  );
}
