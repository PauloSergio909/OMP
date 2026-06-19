import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { OrdemServicoService } from '../ordem-servico/os.service';

const osService = new OrdemServicoService();

// Itens que, se reprovados, disparam OS corretiva automática
const ITENS_CRITICOS = ['Freios', 'Luzes dianteiras', 'Luzes traseiras/freio', 'Extintores'];

const ITENS_PADRAO = [
  'Nível de óleo',
  'Nível de água',
  'Pneus (calibragem e desgaste)',
  'Luzes dianteiras',
  'Luzes traseiras/freio',
  'Documentação (CRLV)',
  'Extintores',
  'Triângulo de segurança',
  'Freios',
  'Buzina',
];

export class ChecklistsService {
  async listarPorCaminhao(caminhaoId: string, limit = 10) {
    return prisma.checklistVistoria.findMany({
      where: { caminhaoId },
      include: {
        motorista: { select: { id: true, nome: true } },
        itens: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async buscar(id: string) {
    return prisma.checklistVistoria.findUniqueOrThrow({
      where: { id },
      include: {
        caminhao: { select: { id: true, codigo: true, modelo: true, placa: true } },
        motorista: { select: { id: true, nome: true, cargo: true } },
        itens: true,
      },
    });
  }

  async criar(data: {
    caminhaoId: string;
    motoristaId: string;
    kmAtual: number;
    tipo: string;
    observacoes?: string;
    itens: { item: string; ok: boolean; observacoes?: string }[];
  }) {
    const itensParaCriar: { item: string; ok: boolean; observacoes?: string }[] = data.itens.length > 0
      ? data.itens
      : ITENS_PADRAO.map((item) => ({ item, ok: true }));

    const aprovado = itensParaCriar.every((i) => i.ok);

    const checklist = await prisma.checklistVistoria.create({
      data: {
        caminhaoId: data.caminhaoId,
        motoristaId: data.motoristaId,
        kmAtual: data.kmAtual,
        tipo: data.tipo,
        aprovado,
        observacoes: data.observacoes ?? null,
        itens: {
          create: itensParaCriar.map((i) => ({
            item: i.item,
            ok: i.ok,
            observacoes: i.observacoes ?? null,
          })),
        },
      },
      include: {
        motorista: { select: { id: true, nome: true } },
        itens: true,
      },
    });

    logger.info(`Checklist criado: ${checklist.id} — caminhão ${data.caminhaoId} (${aprovado ? 'aprovado' : 'reprovado'})`);

    // A5 — Checklist reprovado em item crítico → cria OS corretiva automaticamente
    if (!aprovado) {
      const itensCriticosReprovados = itensParaCriar
        .filter((i) => !i.ok && ITENS_CRITICOS.some((c) => i.item.toLowerCase().includes(c.toLowerCase())));

      if (itensCriticosReprovados.length > 0) {
        // Evita criar OS duplicada se já existe OS corretiva aberta gerada por checklist para este caminhão
        const osAberta = await prisma.ordemServico.count({
          where: {
            caminhaoId: data.caminhaoId,
            tipo: 'corretiva',
            status: { notIn: ['concluida', 'cancelada'] },
            descricao: { contains: 'automaticamente pelo checklist', mode: 'insensitive' },
          },
        });
        if (osAberta > 0) {
          logger.info(`A5: OS corretiva de checklist já existe para caminhão ${data.caminhaoId} — não criando duplicata`);
          return checklist;
        }

        const descricao = `[Checklist] OS gerada automaticamente pelo checklist ${checklist.id}. Itens com problema: ${itensCriticosReprovados.map((i) => i.item).join(', ')}.`;
        try {
          await osService.criar({
            caminhaoId: data.caminhaoId,
            tipo: 'corretiva',
            descricao,
            prioridade: 'alta',
            responsavelId: data.motoristaId,
            dataPrevisao: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            observacoes: `Checklist de vistoria reprovado em itens críticos de segurança.`,
          });
          logger.info(`OS corretiva criada automaticamente pelo checklist ${checklist.id} (itens críticos reprovados)`);
        } catch (e) {
          logger.error('Falha ao criar OS automática pelo checklist', { err: e });
        }
      }
    }

    return checklist;
  }

  itensPadrao() {
    return ITENS_PADRAO;
  }
}
