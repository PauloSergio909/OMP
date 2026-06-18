import { ChevronDown, ChevronUp } from 'lucide-react';

interface SortableThProps {
  label: string;
  field: string;
  sortField: string;
  sortDir: string;
  onSort: (field: string) => void;
  px?: string;
}

export function SortableTh({ label, field, sortField, sortDir, onSort, px = 'px-5' }: SortableThProps) {
  return (
    <th
      onClick={() => field && onSort(field)}
      className={`sticky top-0 z-10 bg-white border-b border-gray-100 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${px} py-3 select-none${field ? ' cursor-pointer hover:text-gray-800' : ''}`}
    >
      <div className="flex items-center gap-1">
        {label}
        {field && (sortField === field
          ? (sortDir === 'asc' ? <ChevronUp size={12} className="text-blue-500" /> : <ChevronDown size={12} className="text-blue-500" />)
          : label ? <ChevronUp size={12} className="text-gray-300" /> : null
        )}
      </div>
    </th>
  );
}
