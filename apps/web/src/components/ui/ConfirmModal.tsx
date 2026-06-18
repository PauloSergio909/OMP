import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  variant?: 'danger' | 'warning' | 'default';
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    btnClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    defaultLabel: 'Excluir',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-600',
    btnClass: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400 text-white',
    defaultLabel: 'Confirmar',
  },
  default: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    btnClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
    defaultLabel: 'Confirmar',
  },
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancelar',
  loading = false,
  variant = 'default',
}: ConfirmModalProps) {
  const cfg = variantConfig[variant];
  const Icon = cfg.icon;

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center gap-4 pt-2">
        <div className={`flex items-center justify-center w-14 h-14 rounded-full ${cfg.iconBg}`}>
          <Icon className={`w-7 h-7 ${cfg.iconColor}`} />
        </div>

        <p className="text-sm text-gray-600 text-center leading-relaxed">{message}</p>

        <div className="flex gap-3 w-full pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${cfg.btnClass}`}
          >
            {loading ? 'Aguarde...' : (confirmLabel ?? cfg.defaultLabel)}
          </button>
        </div>
      </div>
    </Modal>
  );
}
