import { prisma } from '../../config/database';

export class ComprasAnalyticsService {
  async getKPIs() {
    const [pendentes, aprovadas, recebidas, canceladas, atrasadas, valorPendente] = await Promise.all([
      prisma.ordemCompra.count({ where: { status: 'pendente' } }),
      prisma.ordemCompra.count({ where: { status: 'aprovada' } }),
      prisma.ordemCompra.count({ where: { status: 'recebida' } }),
      prisma.ordemCompra.count({ where: { status: 'cancelada' } }),
      prisma.ordemCompra.count({ where: { status: { notIn: ['recebida', 'cancelada'] }, dataEntrega: { lt: new Date() } } }),
      prisma.ordemCompra.aggregate({ where: { status: { in: ['pendente', 'aprovada'] } }, _sum: { valorTotal: true } }),
    ]);

    return {
      pendentes, aprovadas, recebidas, canceladas, atrasadas,
      valorEmAberto: valorPendente._sum.valorTotal ?? 0,
    };
  }
}
