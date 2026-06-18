import { useState } from 'react';
import { ToggleLeft, ToggleRight } from 'lucide-react';

function Toggle({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-label={value ? `Desativar ${label}` : `Ativar ${label}`}
        className="ml-4 flex-shrink-0"
      >
        {value
          ? <ToggleRight size={28} className="text-blue-600" />
          : <ToggleLeft size={28} className="text-gray-300" />
        }
      </button>
    </div>
  );
}

export function SecaoNotificacoes() {
  const [notif, setNotif] = useState({
    estoqueMinimo: true,
    manutencaoVencendo: true,
    novaOS: false,
    email: false,
  });

  return (
    <div className="max-w-lg">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Preferências de Notificação</h2>
      <p className="text-xs text-gray-400 mb-5">Escolha quais alertas deseja receber no sistema.</p>
      <Toggle
        label="Alerta de estoque mínimo"
        description="Notifica quando um material atingir o nível mínimo"
        value={notif.estoqueMinimo}
        onChange={(v) => setNotif({ ...notif, estoqueMinimo: v })}
      />
      <Toggle
        label="Manutenção vencendo"
        description="Alerta quando a próxima manutenção estiver próxima"
        value={notif.manutencaoVencendo}
        onChange={(v) => setNotif({ ...notif, manutencaoVencendo: v })}
      />
      <Toggle
        label="Nova OS criada"
        description="Notifica quando uma nova Ordem de Serviço for aberta"
        value={notif.novaOS}
        onChange={(v) => setNotif({ ...notif, novaOS: v })}
      />
      <Toggle
        label="Notificações por e-mail"
        description="Envia um e-mail resumo diário com os alertas"
        value={notif.email}
        onChange={(v) => setNotif({ ...notif, email: v })}
      />
    </div>
  );
}
