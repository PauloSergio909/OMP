// Barrel — re-exports todos os hooks e tipos por domínio.
// Todos os imports existentes (ex: import { useOrdensServico } from '../../hooks/useApi')
// continuam funcionando sem nenhuma alteração nas páginas.

export type { PaginatedResponse } from './api/_shared';

export * from './api/estoque';
export * from './api/estoque-analytics';
export * from './api/estoque-catalog';
export * from './api/frota';
export * from './api/frota-analytics';
export * from './api/os';
export * from './api/os-analytics';
export * from './api/funcionarios';
export * from './api/funcionarios-analytics';
export * from './api/abastecimento';
export * from './api/abastecimento-analytics';
export * from './api/compras';
export * from './api/compras-analytics';
export * from './api/equipamentos';
export * from './api/equipamentos-analytics';
export * from './api/pneus';
export * from './api/pneus-analytics';
export * from './api/checklists';
export * from './api/agenda';
export * from './api/auth';
export * from './api/search';
