import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EstoqueService } from './estoque.service';
import { EstoqueAnalyticsService } from './estoque-analytics.service';
import { EstoqueCatalogService } from './estoque-catalog.service';
import {
  createMaterialSchema,
  updateMaterialSchema,
  paginationSchema,
  createEntradaEstoqueSchema,
  createSaidaEstoqueSchema,
  createFornecedorSchema,
  updateFornecedorSchema,
  createCategoriaSchema,
  updateCategoriaSchema,
} from '@fleetmaster/shared';
import { authGuard, roleGuard } from '../../middleware/auth.middleware';
import { sendSuccess, sendCreated, sendPaginated } from '../../utils/response';
import { auditar } from '../../middleware/auditoria.middleware';
import { withCache, invalidateCache } from '../../utils/cache';

const estoqueService = new EstoqueService();
const analytics = new EstoqueAnalyticsService();
const catalog = new EstoqueCatalogService();

export async function estoqueRoutes(app: FastifyInstance) {
  app.get('/materiais', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { categoriaId, fornecedorId, abaixoMinimo } = z.object({
      categoriaId: z.string().optional(),
      fornecedorId: z.string().optional(),
      abaixoMinimo: z.coerce.boolean().optional(),
    }).parse(request.query);
    const { materiais, total } = await estoqueService.listarMateriais({ ...params, categoriaId, fornecedorId, abaixoMinimo });
    return sendPaginated(reply, materiais, total, params.page, params.perPage);
  });

  app.get('/materiais/:id', { preHandler: [authGuard] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const material = await estoqueService.buscarMaterial(id);
    return sendSuccess(reply, material);
  });

  app.post('/materiais', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'criar', entidade: 'Material' })],
  }, async (request, reply) => {
    const data = createMaterialSchema.parse(request.body);
    const material = await estoqueService.criarMaterial(data);
    return sendCreated(reply, material, 'Material criado com sucesso');
  });

  app.post('/materiais/importar', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'importar', entidade: 'Material' })],
  }, async (request, reply) => {
    const schema = z.object({
      categoriaId: z.string().uuid('Categoria inválida'),
      fornecedorId: z.string().uuid('Fornecedor inválido'),
      materiais: z.array(z.object({
        nome: z.string().trim().min(2).max(200),
        unidadeMedida: z.enum(['litro', 'unidade', 'jogo', 'metro', 'kg', 'par']),
        precoUnitario: z.number().positive().max(9_999_999.99),
        estoqueMinimo: z.number().int().nonnegative().max(1_000_000),
        estoqueMaximo: z.number().int().positive().max(1_000_000),
      })).min(1, 'Nenhum material para importar').max(500, 'Máximo 500 materiais por importação'),
    });
    const data = schema.parse(request.body);
    const result = await estoqueService.importarMateriais(data);
    return sendSuccess(reply, result, `${result.criados} material(is) importado(s)`);
  });

  app.patch('/materiais/:id/localizacao', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'editar_localizacao', entidade: 'Material', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { localizacao } = z.object({ localizacao: z.string().trim().max(100).nullable() }).parse(request.body);
    const result = await estoqueService.atualizarLocalizacao(id, localizacao);
    return sendSuccess(reply, result, 'Localização atualizada');
  });

  app.patch('/materiais/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'editar', entidade: 'Material', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateMaterialSchema.parse(request.body);
    const material = await estoqueService.atualizarMaterial(id, body);
    return sendSuccess(reply, material, 'Material atualizado');
  });

  app.post('/entrada', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife']), auditar({ acao: 'entrada_estoque', entidade: 'Material' })],
  }, async (request, reply) => {
    const { materialId, quantidade, precoUnitario, motivo } = createEntradaEstoqueSchema.parse(request.body);
    const user = request.user as { id: string };
    const result = await estoqueService.registrarEntrada(materialId, quantidade, precoUnitario, motivo, user.id);
    await invalidateCache('estoque:kpis');
    return sendSuccess(reply, result, 'Entrada registrada com sucesso');
  });

  app.post('/saida', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    preHandler: [authGuard, roleGuard(['admin', 'gerente', 'almoxarife', 'mecanico']), auditar({ acao: 'saida_estoque', entidade: 'Material' })],
  }, async (request, reply) => {
    const { materialId, quantidade, motivo, ordemServicoId } = createSaidaEstoqueSchema.parse(request.body);
    const user = request.user as { id: string };
    const result = await estoqueService.registrarSaida(materialId, quantidade, motivo, user.id, ordemServicoId ?? undefined);
    await invalidateCache('estoque:kpis');
    return sendSuccess(reply, result, 'Saída registrada com sucesso');
  });

  app.get('/alertas', { preHandler: [authGuard] }, async (request, reply) => {
    const criticos = await analytics.materiaisAbaixoDoMinimo();
    return sendSuccess(reply, criticos);
  });

  app.get('/kpis', { preHandler: [authGuard] }, async (_request, reply) => {
    const kpis = await withCache('estoque:kpis', 300, () => analytics.getKPIs());
    return sendSuccess(reply, kpis);
  });

  app.get('/movimentacoes', { preHandler: [authGuard] }, async (request, reply) => {
    const params = paginationSchema.parse(request.query);
    const { materialId, tipo } = z.object({ materialId: z.string().optional(), tipo: z.string().optional() }).parse(request.query);
    const { movimentacoes, total } = await estoqueService.listarMovimentacoes({ ...params, materialId, tipo });
    return sendPaginated(reply, movimentacoes, total, params.page, params.perPage);
  });

  app.get('/categorias', { preHandler: [authGuard] }, async (_request, reply) => {
    const categorias = await catalog.listarCategorias();
    return sendSuccess(reply, categorias);
  });

  app.post('/categorias', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'criar', entidade: 'Categoria' })],
  }, async (request, reply) => {
    const data = createCategoriaSchema.parse(request.body);
    const cat = await catalog.criarCategoria(data);
    return sendCreated(reply, cat, 'Categoria criada');
  });

  app.patch('/categorias/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'editar', entidade: 'Categoria', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateCategoriaSchema.parse(request.body);
    const cat = await catalog.atualizarCategoria(id, data);
    return sendSuccess(reply, cat, 'Categoria atualizada');
  });

  app.get('/fornecedores', { preHandler: [authGuard] }, async (request, reply) => {
    const { page } = z.object({ page: z.string().optional() }).parse(request.query);
    if (page) {
      const params = paginationSchema.parse(request.query);
      const result = await catalog.listarFornecedoresPaginado(params);
      return sendPaginated(reply, result.fornecedores, result.total, params.page, params.perPage);
    }
    const fornecedores = await catalog.listarFornecedores();
    return sendSuccess(reply, fornecedores);
  });

  app.post('/fornecedores', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'criar', entidade: 'Fornecedor' })],
  }, async (request, reply) => {
    const data = createFornecedorSchema.parse(request.body);
    const forn = await catalog.criarFornecedor(data);
    return sendCreated(reply, forn, 'Fornecedor criado');
  });

  app.patch('/fornecedores/:id', {
    preHandler: [authGuard, roleGuard(['admin', 'gerente']), auditar({ acao: 'editar', entidade: 'Fornecedor', getEntidadeId: (req) => (req.params as { id: string }).id })],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = updateFornecedorSchema.parse(request.body);
    const forn = await catalog.atualizarFornecedor(id, data);
    return sendSuccess(reply, forn, 'Fornecedor atualizado');
  });
}
