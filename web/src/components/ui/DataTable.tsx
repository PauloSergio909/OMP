// ══════════════════════════════════════════════════════════════
// DATA TABLE — Tabela reutilizável com busca e paginação
// ══════════════════════════════════════════════════════════════
// Componente genérico: recebe colunas + dados e renderiza a tabela.
// Usado em Estoque, Frota, OS — qualquer listagem do sistema.
//
// COMO USAR:
// <DataTable
//   columns={[
//     { key: 'codigo', label: 'Código' },
//     { key: 'nome', label: 'Nome' },
//     { key: 'status', label: 'Status', render: (row) => <StatusBadge status={row.status} /> },
//   ]}
//   data={materiais}
//   totalPages={10}
//   currentPage={1}
//   onPageChange={(page) => setPage(page)}
// />

import { useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Define o formato de cada coluna
interface Column<T> {
  key: string;                            // Chave do campo nos dados
  label: string;                          // Texto do cabeçalho
  render?: (row: T) => React.ReactNode;   // Render customizado (opcional)
  className?: string;                     // Classe CSS extra
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
  isLoading?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  searchPlaceholder = 'Buscar...',
  onSearch,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  emptyMessage = 'Nenhum registro encontrado',
  isLoading = false,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');

  const handleSearch = (value: string) => {
    setSearch(value);
    onSearch?.(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      {/* Barra de busca */}
      {onSearch && (
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-fleet-info/30 focus:border-fleet-info"
            />
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50/80">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              // Estado de carregamento
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center">
                  <div className="w-8 h-8 border-3 border-fleet-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <span className="text-sm text-gray-400">Carregando...</span>
                </td>
              </tr>
            ) : data.length === 0 ? (
              // Estado vazio
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Dados normais
              data.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50/50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-5 py-3.5 text-sm ${col.className || ''}`}>
                      {/* Se a coluna tem render customizado, usa ele. Senão, mostra o valor direto */}
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <span className="text-xs text-gray-400">
            Página {currentPage} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange?.(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange?.(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
