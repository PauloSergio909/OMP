import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authGuard } from '../../middleware/auth.middleware';
import { sendSuccess } from '../../utils/response';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/', { preHandler: [authGuard] }, async (request, reply) => {
    const { q } = z.object({
      q: z.string().trim().min(2, 'Mínimo 2 caracteres').max(100),
    }).parse(request.query);

    const like = { contains: q, mode: 'insensitive' } as const;

    const [caminhoes, ordens, materiais, funcionarios, equipamentos, fornecedores] = await Promise.all([
      prisma.caminhao.findMany({
        where: { OR: [{ placa: like }, { codigo: like }, { modelo: like }, { chassi: like }] },
        select: { id: true, codigo: true, placa: true, modelo: true, status: true },
        take: 5,
      }),
      prisma.ordemServico.findMany({
        where: { OR: [{ codigo: like }, { descricao: like }] },
        select: { id: true, codigo: true, tipo: true, status: true, prioridade: true, caminhao: { select: { placa: true } } },
        orderBy: { dataAbertura: 'desc' },
        take: 5,
      }),
      prisma.material.findMany({
        where: { ativo: true, OR: [{ nome: like }, { codigo: like }] },
        select: { id: true, codigo: true, nome: true, unidadeMedida: true },
        take: 5,
      }),
      prisma.funcionario.findMany({
        where: { ativo: true, OR: [{ nome: like }, { cpf: like }, { cargo: like }] },
        select: { id: true, nome: true, cargo: true, cpf: true },
        take: 5,
      }),
      prisma.equipamento.findMany({
        where: { ativo: true, OR: [{ nome: like }, { codigo: like }, { tipo: like }] },
        select: { id: true, codigo: true, nome: true, tipo: true, status: true },
        take: 5,
      }),
      prisma.fornecedor.findMany({
        where: { OR: [{ razaoSocial: like }, { cnpj: like }, { email: like }] },
        select: { id: true, razaoSocial: true, cnpj: true, email: true },
        take: 5,
      }),
    ]);

    const total = caminhoes.length + ordens.length + materiais.length + funcionarios.length + equipamentos.length + fornecedores.length;

    return sendSuccess(reply, { total, caminhoes, ordens, materiais, funcionarios, equipamentos, fornecedores });
  });
}
