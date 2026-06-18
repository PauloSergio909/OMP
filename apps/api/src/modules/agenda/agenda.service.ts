import { prisma } from '../../config/database';
import { AppError } from '../../utils/app-error';

export class AgendaService {
  async listarEventos(mes?: string) {
    const refDate = mes ? new Date(`${mes}-01`) : new Date();
    const inicio = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    const fim = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const [caminhoes, ordensServico, manuais] = await Promise.all([
      prisma.caminhao.findMany({
        where: { proximaManutencao: { gte: inicio, lte: fim } },
        select: {
          id: true, codigo: true, modelo: true, placa: true, proximaManutencao: true, status: true,
          motorista: { select: { id: true, nome: true } },
        },
        orderBy: { proximaManutencao: 'asc' },
      }),
      prisma.ordemServico.findMany({
        where: {
          dataPrevisao: { gte: inicio, lte: fim },
          status: { notIn: ['concluida', 'cancelada', 'orcamento'] },
        },
        select: {
          id: true, codigo: true, tipo: true, status: true, prioridade: true, dataPrevisao: true,
          caminhao: { select: { id: true, codigo: true, placa: true } },
          responsavel: { select: { id: true, nome: true } },
        },
        orderBy: { dataPrevisao: 'asc' },
      }),
      prisma.agendaEvento.findMany({
        where: { data: { gte: inicio, lte: fim } },
        orderBy: { data: 'asc' },
      }),
    ]);

    const eventos = [
      ...caminhoes.map((c) => ({
        id: c.id,
        tipo: 'manutencao' as const,
        data: c.proximaManutencao!.toISOString().substring(0, 10),
        titulo: `Manutenção — ${c.codigo}`,
        subtitulo: `${c.modelo} (${c.placa})`,
        cor: 'orange',
        link: `/frota/${c.id}`,
        editavel: false,
        ref: {
          id: c.id, codigo: c.codigo, modelo: c.modelo, placa: c.placa,
          status: c.status, motoristaNome: c.motorista?.nome ?? null,
        },
      })),
      ...ordensServico.map((os) => ({
        id: os.id,
        tipo: 'os' as const,
        data: new Date(os.dataPrevisao).toISOString().substring(0, 10),
        titulo: `OS ${os.codigo}`,
        subtitulo: `${os.caminhao?.placa ?? ''} — ${os.responsavel?.nome ?? ''}`,
        cor: os.prioridade === 'critica' ? 'red' : os.prioridade === 'alta' ? 'orange' : 'blue',
        link: `/ordens-servico/${os.id}`,
        editavel: false,
        ref: { id: os.id, codigo: os.codigo, tipo: os.tipo, status: os.status, prioridade: os.prioridade },
      })),
      ...manuais.map((e) => ({
        id: e.id,
        tipo: 'manual' as const,
        data: e.data.toISOString().substring(0, 10),
        titulo: e.titulo,
        subtitulo: e.descricao ?? '',
        cor: e.cor,
        link: e.link ?? null,
        editavel: true,
        tipoEvento: e.tipo,
        descricao: e.descricao ?? null,
        ref: { id: e.id, descricao: e.descricao },
      })),
    ];

    return { mes: inicio.toISOString().substring(0, 7), eventos };
  }

  async atualizarEvento(
    id: string,
    data: { titulo?: string; descricao?: string | null; data?: string; tipo?: string; cor?: string; link?: string | null },
    usuarioId: string,
  ) {
    const ev = await prisma.agendaEvento.findUniqueOrThrow({ where: { id }, select: { usuarioId: true } });
    if (ev.usuarioId !== usuarioId) {
      throw new AppError('Você não tem permissão para editar este evento', 403);
    }
    return prisma.agendaEvento.update({
      where: { id },
      data: {
        ...(data.titulo !== undefined && { titulo: data.titulo }),
        ...(data.descricao !== undefined && { descricao: data.descricao }),
        ...(data.data !== undefined && { data: new Date(data.data) }),
        ...(data.tipo !== undefined && { tipo: data.tipo }),
        ...(data.cor !== undefined && { cor: data.cor }),
        ...(data.link !== undefined && { link: data.link }),
      },
    });
  }

  async criarEvento(data: { titulo: string; descricao?: string; data: string; tipo?: string; cor?: string; link?: string }, usuarioId: string) {
    return prisma.agendaEvento.create({
      data: {
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        data: new Date(data.data),
        tipo: data.tipo ?? 'lembrete',
        cor: data.cor ?? 'blue',
        link: data.link ?? null,
        usuarioId,
      },
    });
  }

  async removerEvento(id: string, usuarioId: string) {
    const ev = await prisma.agendaEvento.findUniqueOrThrow({ where: { id }, select: { usuarioId: true } });
    if (ev.usuarioId !== usuarioId) {
      throw new AppError('Você não tem permissão para remover este evento', 403);
    }
    return prisma.agendaEvento.delete({ where: { id } });
  }
}
