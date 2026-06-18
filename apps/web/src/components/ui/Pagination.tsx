import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}

function scrollMainToTop() {
  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
}

export function Pagination({ page, totalPages, total, perPage, onChange }: PaginationProps) {
  if (total === 0) return null;

  function handleChange(newPage: number) {
    onChange(newPage);
    scrollMainToTop();
  }

  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);

  if (totalPages <= 1) {
    return (
      <div className="px-5 py-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">{total}</span>{' '}
          registro{total !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
      <p className="text-xs text-gray-500">
        Exibindo <span className="font-medium text-gray-700">{from}–{to}</span> de{' '}
        <span className="font-medium text-gray-700">{total}</span> registros
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => handleChange(page - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-xs text-gray-400">…</span>
          ) : (
            <button
              key={p}
              onClick={() => handleChange(p as number)}
              className={`min-w-[30px] h-[30px] rounded-lg text-xs font-medium transition ${
                p === page
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => handleChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Próxima página"
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>
    </div>
  );
}
