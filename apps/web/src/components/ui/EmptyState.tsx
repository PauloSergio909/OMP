import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  icon?: LucideIcon;
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  compact?: boolean;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  const ActionIcon = action?.icon;

  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
        <Icon className="w-8 h-8 text-gray-300" strokeWidth={1.5} />
        <p className="text-sm text-gray-500">{title}</p>
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {action.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl">
        <Icon className="w-8 h-8 text-gray-400" strokeWidth={1.5} />
      </div>

      <div className="space-y-1 max-w-xs">
        <p className="text-base font-semibold text-gray-700">{title}</p>
        {description && (
          <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        )}
      </div>

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          {ActionIcon && <ActionIcon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  );
}
