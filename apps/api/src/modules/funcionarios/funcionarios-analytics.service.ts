import { prisma } from '../../config/database';

export class FuncionariosAnalyticsService {
  async getKPIs() {
    const limite30 = new Date();
    limite30.setDate(limite30.getDate() + 30);

    const [total, motoristas, mecanicos, ativos, cnhVencendo] = await Promise.all([
      prisma.funcionario.count(),
      prisma.funcionario.count({ where: { cargo: 'motorista', ativo: true } }),
      prisma.funcionario.count({ where: { cargo: 'mecanico', ativo: true } }),
      prisma.funcionario.count({ where: { ativo: true } }),
      prisma.funcionario.count({
        where: { cargo: 'motorista', ativo: true, cnhValidade: { lte: limite30 } },
      }),
    ]);

    return { total, motoristas, mecanicos, ativos, inativos: total - ativos, cnhVencendo };
  }

  async cnhVencendo(diasAviso = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() + diasAviso);

    return prisma.funcionario.findMany({
      where: { cargo: 'motorista', ativo: true, cnhValidade: { lte: limite } },
      select: { id: true, nome: true, cnhCategoria: true, cnhValidade: true, telefone: true },
      orderBy: { cnhValidade: 'asc' },
      take: 50,
    });
  }

  async motoristasDisponiveis() {
    return prisma.funcionario.findMany({
      where: {
        cargo: 'motorista',
        ativo: true,
        caminhoesMotorista: { none: { status: { notIn: ['parado'] } } },
      },
      select: { id: true, nome: true, cnhCategoria: true, cnhValidade: true, telefone: true },
      orderBy: { nome: 'asc' },
      take: 200,
    });
  }
}
