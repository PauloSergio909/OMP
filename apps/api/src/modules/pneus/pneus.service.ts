import { prisma, type PrismaTx } from '../../config/database';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/app-error';

const POSICOES = ['dianteiro_esq', 'dianteiro_dir', 'traseiro_esq_ext', 'traseiro_esq_int', 'traseiro_dir_int', 'traseiro_dir_ext', 'estepe'];

export class PneusService {
  async listarPorCaminhao(caminhaoId: string) {
    const pneus = await prisma.pneu.findMany({
      where: { caminhaoId },
      include: { trocas: { orderBy: { createdAt: 'desc' }, take: 5 } },
      orderBy: { posicao: 'asc' },
    });

    return pneus;
  }

  async buscar(id: string) {
    return prisma.pneu.findUniqueOrThrow({
      where: { id },
      include: { trocas: { orderBy: { createdAt: 'desc' } } },
    });
  }

  async criar(data: {
    caminhaoId: string;
    posicao: string;
    marca: string;
    modelo: string;
    numeroSerie?: string;
    kmInstalacao: number;
    kmVidaUtil?: number;
  }) {
    if (!POSICOES.includes(data.posicao)) {
      throw new AppError(`Posição inválida. Use: ${POSICOES.join(', ')}`, 422);
    }

    const existing = await prisma.pneu.findFirst({
      where: { caminhaoId: data.caminhaoId, posicao: data.posicao, status: 'ativo' },
    });
    if (existing) {
      throw new AppError(`Já existe um pneu ativo na posição ${data.posicao}`, 409);
    }

    // KM de instalação não pode ser maior que o KM atual do caminhão
    const caminhao = await prisma.caminhao.findUniqueOrThrow({
      where: { id: data.caminhaoId },
      select: { kmAtual: true },
    });
    if (data.kmInstalacao > caminhao.kmAtual) {
      throw new AppError(
        `KM de instalação (${data.kmInstalacao}) não pode ser maior que o KM atual do caminhão (${caminhao.kmAtual})`,
        422,
      );
    }

    for (let tentativa = 0; tentativa < 3; tentativa++) {
      const last = await prisma.pneu.findFirst({
        where: { codigo: { startsWith: 'PNE-' } },
        orderBy: { codigo: 'desc' },
      });
      const nextNum = last ? (parseInt(last.codigo.split('-')[1] ?? '0', 10) || 0) + 1 : 1;
      const codigo = `PNE-${String(nextNum).padStart(3, '0')}`;

      try {
        const pneu = await prisma.pneu.create({
          data: {
            codigo,
            caminhaoId: data.caminhaoId,
            posicao: data.posicao,
            marca: data.marca,
            modelo: data.modelo,
            numeroSerie: data.numeroSerie ?? null,
            kmInstalacao: data.kmInstalacao,
            kmVidaUtil: data.kmVidaUtil ?? 80000,
          },
          include: { trocas: true },
        });
        logger.info(`Pneu criado: ${codigo} — ${data.posicao} em caminhão ${data.caminhaoId}`);
        return pneu;
      } catch (e) {
        if (e instanceof Error && (e as { code?: string }).code === 'P2002' && tentativa < 2) continue;
        throw e;
      }
    }
    throw new Error('Falha ao gerar código único para o pneu');
  }

  async registrarTroca(pneuId: string, data: {
    kmTroca: number;
    motivo: string;
    custo?: number;
    observacoes?: string;
    novoPneu?: {
      posicao: string; marca: string; modelo: string; numeroSerie?: string; kmInstalacao: number; kmVidaUtil?: number;
    };
  }) {
    // Busca o pneu antes da transação para ter caminhaoId disponível depois
    const pneu = await prisma.pneu.findUniqueOrThrow({
      where: { id: pneuId },
      include: { caminhao: { select: { kmAtual: true } } },
    });
    if (pneu.status !== 'ativo') throw new AppError('Pneu não está ativo', 422);

    // kmTroca deve ser >= ao km de instalação do pneu (o caminhão só avança)
    if (data.kmTroca < pneu.kmInstalacao) {
      throw new AppError(
        `KM de troca (${data.kmTroca}) não pode ser menor que o KM de instalação do pneu (${pneu.kmInstalacao})`,
        422,
      );
    }

    // Troca em transação atômica: desativa pneu + registra troca
    const troca = await prisma.$transaction(async (tx: PrismaTx) => {
      await tx.pneu.update({ where: { id: pneuId }, data: { status: 'trocado' } });
      return tx.trocaPneu.create({
        data: { pneuId, kmTroca: data.kmTroca, motivo: data.motivo, custo: data.custo ?? null, observacoes: data.observacoes ?? null },
      });
    });

    // Cria novo pneu fora da transação (usa prisma direto com retry loop)
    let novoPneuCriado = null;
    if (data.novoPneu) {
      novoPneuCriado = await this.criar({ caminhaoId: pneu.caminhaoId, ...data.novoPneu });
    }

    logger.info(`Troca de pneu registrada: ${pneuId} no km ${data.kmTroca}`);
    return { troca, novoPneu: novoPneuCriado };
  }

}
