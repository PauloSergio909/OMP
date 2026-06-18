interface SkeletonProps {
  className?: string;
}

function SkeletonBlock({ className = '' }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// ── Linha de tabela ──────────────────────────────────────────────
function TableRowSkeleton() {
  return (
    <tr className="border-b border-gray-100">
      <td className="px-4 py-3"><SkeletonBlock className="h-4 w-24" /></td>
      <td className="px-4 py-3"><SkeletonBlock className="h-4 w-32" /></td>
      <td className="px-4 py-3"><SkeletonBlock className="h-4 w-20" /></td>
      <td className="px-4 py-3"><SkeletonBlock className="h-4 w-16" /></td>
      <td className="px-4 py-3"><SkeletonBlock className="h-4 w-24" /></td>
      <td className="px-4 py-3"><SkeletonBlock className="h-6 w-14 rounded-full" /></td>
      <td className="px-4 py-3"><SkeletonBlock className="h-8 w-20 rounded-md" /></td>
    </tr>
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
}

export function TableSkeleton({ rows = 5, cols = 7 }: TableSkeletonProps) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <SkeletonBlock className={`h-4 ${j === cols - 1 ? 'w-20 rounded-md' : j % 3 === 0 ? 'w-24' : j % 3 === 1 ? 'w-32' : 'w-16'}`} />
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

// ── Card de KPI ──────────────────────────────────────────────────
export function KpiCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-28" />
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
      </div>
      <SkeletonBlock className="h-8 w-20" />
      <SkeletonBlock className="h-3 w-36" />
    </div>
  );
}

interface KpiGridSkeletonProps {
  count?: number;
}

export function KpiGridSkeleton({ count = 4 }: KpiGridSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </>
  );
}

// ── Página de detalhe ────────────────────────────────────────────
export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <SkeletonBlock className="h-9 w-9 rounded-lg" />
        <div className="space-y-2">
          <SkeletonBlock className="h-6 w-48" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Content block */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <SkeletonBlock className="h-5 w-36" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50">
              <SkeletonBlock className="h-4 w-32" />
              <SkeletonBlock className="h-4 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Card de lista (kanban / grid) ─────────────────────────────────
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-3/4" />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="h-3 w-16" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
    </div>
  );
}

export { TableRowSkeleton };
