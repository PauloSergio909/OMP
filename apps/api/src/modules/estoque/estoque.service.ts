import { prisma, type PrismaTx } from '../../config/database';
import { logger } from '../../utils/logger';
import { Prisma } from '@prisma/client';
import { AppError } from '../../utils/app-error';
import type {
  CreateMaterialInput,
  PaginationInput,
} from '@fleetmaster/shared';

export class EstoqueService {
  async listarMateriais(params: PaginationInput & { categoriaId?: string; fornecedorId?: string; abaixoMinimo?: boolean }) {
    const { page, perPage, search, orderBy, order, categoriaId, fornecedorId, abaixoMinimo } = params;

    const where: Prisma.MaterialWhereInput = { ativo: true };

    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoriaId) {
      where.categoriaId = categoriaId;
    }

    if (fornecedorId) {
      where.fornecedorId = fornecedorId;
    }

    if (abaixoMinimo) {
      const criticos = await prisma.$queryRaw<{ id: string }[]>`
        SELECT m.id FROM materiais m
        LEFT JOIN estoques e ON e.material_id = m.id
        WHERE m.ativo = true AND COALESCE(e.quantidade, 0) < m.estoque_minimo
      `;
      where.id = { in: criticos.map((r: { id: string }) => r.id) };
    }

    const [materiais, total] = await Promise.all([
      prisma.material.findMany({
        where,
        include: {
          categoria: true,
          fornecedor: true,
          estoques: true,
        },
        orderBy: { [['nome', 'codigo', 'precoUnitario', 'createdAt'].includes(orderBy ?? '') ? orderBy! : 'nome']: order },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.material.count({ where }),
    ]);

    return { materiais, total };
  }

  async atualizarLocalizacao(materialId: string, localizacao: string | null) {
    const estoque = await prisma.estoque.findUnique({ where: { materialId } });
    if (!estoque) {
      await prisma.estoque.create({ data: { materialId, quantidade: 0, localizacao } });
    } else {
      await prisma.estoque.update({ where: { materialId }, data: { localizacao } });
    }
    return { materialId, localizacao };
  }

  async buscarMaterial(id: string) {
    return prisma.material.findUniqueOrThrow({
      where: { id },
      include: {
        categoria: true,
        fornecedor: true,
        estoques: true,
        movimentacoes: {
          include: {
            usuario: { select: { id: true, nome: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  async criarMaterial(data: CreateMaterialInput) {
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const lastMaterial = await prisma.material.findFirst({ orderBy: { codigo: 'desc' } });
      const nextNumber = lastMaterial
        ? (parseInt(lastMaterial.codigo.split('-')[1] ?? '0', 10) || 0) + 1
        : 1;
      const codigo = `MAT-${String(nextNumber).padStart(3, '0')}`;

      try {
        const result = await prisma.$transaction(async (tx: PrismaTx) => {
          const material = await tx.material.create({
            data: {
              codigo,
              nome: data.nome,
              categoriaId: data.categoriaId,
              unidadeMedida: data.unidadeMedida,
              precoUnitario: data.precoUnitario,
              estoqueMinimo: data.estoqueMinimo,
              estoqueMaximo: data.estoqueMaximo,
              fornecedorId: data.fornecedorId,
            },
            include: { categoria: true, fornecedor: true },
          });

          await tx.estoque.create({ data: { materialId: material.id, quantidade: 0 } });
          return material;
        });

        logger.info(`Material criado: ${codigo} — ${data.nome}`);
        return result;
      } catch (e) {
        if (e instanceof Error && (e as { code?: string }).code === 'P2002' && tentativa < 2) continue;
        throw e;
      }
    }
    throw new Error('Falha ao gerar código único para o material');
  }

  async atualizarMaterial(id: string, data: {
    nome?: string;
    categoriaId?: string;
    unidadeMedida?: string;
    precoUnitario?: number;
    estoqueMinimo?: number;
    estoqueMaximo?: number;
    fornecedorId?: string;
    ativo?: boolean;
  }) {
    return prisma.material.update({
      where: { id },
      data,
      include: { categoria: true, fornecedor: true, estoques: true },
    });
  }

  async registrarEntrada(
    materialId: string,
    quantidade: number,
    precoUnitario: number,
    motivo: string,
    usuarioId: string,
  ) {
    const result = await prisma.$transaction(async (tx: PrismaTx) => {
      const estoque = await tx.estoque.update({
        where: { materialId },
        data: {
          quantidade: { increment: quantidade },
          ultimaAtualizacao: new Date(),
        },
      });

      const movimentacao = await tx.movimentacao.create({
        data: {
          materialId,
          tipo: 'entrada',
          quantidade,
          precoUnitario,
          motivo,
          usuarioId,
        },
      });

      await tx.material.update({
        where: { id: materialId },
        data: { precoUnitario },
      });

      return { estoque, movimentacao };
    });

    logger.info(`Entrada: +${quantidade} un de ${materialId} — ${motivo}`);
    return result;
  }

  async registrarSaida(
    materialId: string,
    quantidade: number,
    motivo: string,
    usuarioId: string,
    ordemServicoId?: string,
  ) {
    const result = await prisma.$transaction(async (tx: PrismaTx) => {
      const estoqueAtual = await tx.estoque.findUniqueOrThrow({
        where: { materialId },
        include: { material: true },
      });

      const updated = await tx.estoque.updateMany({
        where: { materialId, quantidade: { gte: quantidade } },
        data: { quantidade: { decrement: quantidade }, ultimaAtualizacao: new Date() },
      });

      if (updated.count === 0) {
        throw new AppError(
          `Estoque insuficiente. Disponível: ${estoqueAtual.quantidade} ${estoqueAtual.material.unidadeMedida}`,
          422,
        );
      }

      const movimentacao = await tx.movimentacao.create({
        data: {
          materialId,
          tipo: 'saida',
          quantidade,
          precoUnitario: estoqueAtual.material.precoUnitario,
          motivo,
          usuarioId,
          ordemServicoId,
        },
      });

      const novaQuantidade = estoqueAtual.quantidade - quantidade;
      if (novaQuantidade < estoqueAtual.material.estoqueMinimo) {
        logger.warn(
          `⚠️ ALERTA: ${estoqueAtual.material.nome} abaixo do mínimo! ` +
          `Atual: ${novaQuantidade}, Mínimo: ${estoqueAtual.material.estoqueMinimo}`,
        );
      }

      return {
        estoque: { ...estoqueAtual, quantidade: novaQuantidade, ultimaAtualizacao: new Date() },
        movimentacao,
        abaixoMinimo: novaQuantidade < estoqueAtual.material.estoqueMinimo,
        material: estoqueAtual.material,
      };
    });

    logger.info(`Saída: -${quantidade} un de ${materialId} — ${motivo}`);

    // A2 — Sugestão de OC automática quando estoque abaixa do mínimo
    if (result.abaixoMinimo) {
      await this.sugerirOCAutomatica(result.material);
    }

    return result;
  }

  private async sugerirOCAutomatica(material: {
    id: string; nome: string; fornecedorId: string; precoUnitario: number;
    estoqueMinimo: number; estoqueMaximo: number;
  }) {
    // Verifica se já existe OC pendente/aprovada para este material
    const ocExistente = await prisma.itemCompra.findFirst({
      where: {
        materialId: material.id,
        ordemCompra: { status: { in: ['pendente', 'aprovada'] } },
      },
    });

    if (ocExistente) {
      logger.info(`OC automática para ${material.nome} pulada: já existe OC pendente/aprovada`);
      return;
    }

    // Calcula quantidade a repor (até o máximo)
    const estoqueAtual = await prisma.estoque.findUnique({ where: { materialId: material.id } });
    const qtdAtual = estoqueAtual?.quantidade ?? 0;
    const qtdRepor = Math.max(1, material.estoqueMaximo - qtdAtual);
    const valorTotal = qtdRepor * material.precoUnitario;

    // Gera código OC com retry
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const lastOC = await prisma.ordemCompra.findFirst({ orderBy: { codigo: 'desc' } });
      const year = new Date().getFullYear();
      const lastNum = lastOC ? (parseInt(lastOC.codigo.split('-')[2] ?? '0', 10) || 0) : 0;
      const codigo = `OC-${year}-${String(lastNum + 1).padStart(3, '0')}`;

      try {
        await prisma.ordemCompra.create({
          data: {
            codigo,
            fornecedorId: material.fornecedorId,
            valorTotal,
            observacoes: `OC criada automaticamente: estoque de "${material.nome}" abaixo do mínimo.`,
            itens: { create: [{ materialId: material.id, quantidade: qtdRepor, precoUnitario: material.precoUnitario }] },
          },
        });
        logger.info(`OC automática criada: ${codigo} — ${material.nome} (${qtdRepor} un)`);
        return;
      } catch (e) {
        if (e instanceof Error && (e as { code?: string }).code === 'P2002' && tentativa < 2) continue;
        logger.error(`Falha ao criar OC automática para ${material.nome}`, { err: e });
        return;
      }
    }
  }

  async listarMovimentacoes(params: PaginationInput & { materialId?: string; tipo?: string }) {
    const { page, perPage, materialId, tipo } = params;

    const where: Prisma.MovimentacaoWhereInput = {};
    if (materialId) where.materialId = materialId;
    if (tipo) where.tipo = tipo;

    const [movimentacoes, total] = await Promise.all([
      prisma.movimentacao.findMany({
        where,
        include: {
          material: { select: { id: true, nome: true, codigo: true, unidadeMedida: true } },
          usuario: { select: { id: true, nome: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.movimentacao.count({ where }),
    ]);

    return { movimentacoes, total };
  }

  async importarMateriais(data: {
    categoriaId: string;
    fornecedorId: string;
    materiais: { nome: string; unidadeMedida: CreateMaterialInput['unidadeMedida']; precoUnitario: number; estoqueMinimo: number; estoqueMaximo: number }[];
  }) {
    let criados = 0;
    const erros: { nome: string; mensagem: string }[] = [];

    for (const mat of data.materiais) {
      try {
        await this.criarMaterial({ ...mat, categoriaId: data.categoriaId, fornecedorId: data.fornecedorId });
        criados++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Erro desconhecido';
        erros.push({ nome: mat.nome, mensagem: msg });
      }
    }

    logger.info(`Importação de materiais: ${criados} criados, ${erros.length} erros`);
    return { criados, erros };
  }

}
