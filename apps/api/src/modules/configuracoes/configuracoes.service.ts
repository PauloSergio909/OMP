import { prisma } from '../../config/database';
import { Prisma } from '@prisma/client';
import type { UpdateEmpresaInput } from '@fleetmaster/shared';

const EMPRESA_ID = 'singleton';

export class ConfiguracoesService {
  async getEmpresa() {
    const empresa = await prisma.configuracaoEmpresa.findUnique({ where: { id: EMPRESA_ID } });
    if (empresa) return empresa;

    return prisma.configuracaoEmpresa.create({
      data: {
        id: EMPRESA_ID,
        razaoSocial: 'Minha Empresa',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: '',
        logoUrl: '',
      },
    });
  }

  async updateEmpresa(data: UpdateEmpresaInput) {
    const campos = {
      razaoSocial: data.razaoSocial,
      cnpj: data.cnpj ?? '',
      telefone: data.telefone ?? '',
      email: data.email ?? '',
      endereco: data.endereco ?? '',
      logoUrl: data.logoUrl ?? '',
    };
    return prisma.configuracaoEmpresa.upsert({
      where: { id: EMPRESA_ID },
      update: campos,
      create: { id: EMPRESA_ID, ...campos },
    });
  }

  async getLogsAuditoria(params: { page: number; perPage: number; userId?: string; entidade?: string }) {
    const { page, perPage, userId, entidade } = params;
    const where: Prisma.LogAuditoriaWhereInput = {
      ...(userId ? { userId } : {}),
      ...(entidade ? { entidade } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.logAuditoria.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.logAuditoria.count({ where }),
    ]);

    return { logs, total };
  }
}
