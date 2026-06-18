import { ConfiguracoesService } from '../modules/configuracoes/configuracoes.service';

jest.mock('../config/database', () => ({
  prisma: {
    configuracaoEmpresa: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    logAuditoria: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '../config/database';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const svc = new ConfiguracoesService();

const empresaFixture = {
  id: 'singleton',
  razaoSocial: 'Test Corp',
  cnpj: '00.000.000/0001-00',
  telefone: '',
  email: '',
  endereco: '',
  logoUrl: '',
  updatedAt: new Date(),
};

describe('ConfiguracoesService.getEmpresa', () => {
  it('retorna registro existente quando encontrado', async () => {
    (mockPrisma.configuracaoEmpresa.findUnique as jest.Mock).mockResolvedValue(empresaFixture);
    const result = await svc.getEmpresa();
    expect(result).toEqual(empresaFixture);
    expect(mockPrisma.configuracaoEmpresa.create).not.toHaveBeenCalled();
  });

  it('cria registro padrão quando não existe', async () => {
    (mockPrisma.configuracaoEmpresa.findUnique as jest.Mock).mockResolvedValue(null);
    (mockPrisma.configuracaoEmpresa.create as jest.Mock).mockResolvedValue({ ...empresaFixture, razaoSocial: 'Minha Empresa' });
    const result = await svc.getEmpresa();
    expect(result.razaoSocial).toBe('Minha Empresa');
    expect(mockPrisma.configuracaoEmpresa.create).toHaveBeenCalledTimes(1);
  });
});

describe('ConfiguracoesService.getLogsAuditoria', () => {
  it('retorna logs paginados', async () => {
    const logFixture = { id: '1', userId: 'u1', userNome: 'Admin', acao: 'criar', entidade: 'OrdemServico', entidadeId: null, ip: null, createdAt: new Date(), detalhes: null };
    (mockPrisma.logAuditoria.findMany as jest.Mock).mockResolvedValue([logFixture]);
    (mockPrisma.logAuditoria.count as jest.Mock).mockResolvedValue(1);
    const result = await svc.getLogsAuditoria({ page: 1, perPage: 10 });
    expect(result.logs).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('aplica filtros userId e entidade', async () => {
    (mockPrisma.logAuditoria.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.logAuditoria.count as jest.Mock).mockResolvedValue(0);
    await svc.getLogsAuditoria({ page: 1, perPage: 10, userId: 'u99', entidade: 'OrdemCompra' });
    expect(mockPrisma.logAuditoria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u99', entidade: 'OrdemCompra' } }),
    );
  });
});

// ─── updateEmpresa ────────────────────────────────────────────────────────────

describe('ConfiguracoesService.updateEmpresa', () => {
  const inputEmpresa = { razaoSocial: 'OMP Transportes', cnpj: '12.345.678/0001-99', telefone: '(11) 3000-0000', email: 'contato@omp.com', endereco: 'Rua A, 100', logoUrl: '' };

  beforeEach(() => {
    (mockPrisma.configuracaoEmpresa.upsert as jest.Mock).mockResolvedValue({ id: 'singleton', ...inputEmpresa, updatedAt: new Date() });
  });

  it('chama upsert com where: { id: "singleton" }', async () => {
    await svc.updateEmpresa(inputEmpresa);

    expect(mockPrisma.configuracaoEmpresa.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'singleton' } }),
    );
  });

  it('os blocos update e create contêm razaoSocial mapeada', async () => {
    await svc.updateEmpresa(inputEmpresa);

    const chamada = (mockPrisma.configuracaoEmpresa.upsert as jest.Mock).mock.calls[0][0];
    expect(chamada.update.razaoSocial).toBe('OMP Transportes');
    expect(chamada.create.razaoSocial).toBe('OMP Transportes');
    expect(chamada.create.id).toBe('singleton');
  });

  it('substitui campos undefined por string vazia', async () => {
    await svc.updateEmpresa({ razaoSocial: 'Empresa', cnpj: undefined, telefone: undefined, email: undefined, endereco: undefined, logoUrl: undefined });

    const chamada = (mockPrisma.configuracaoEmpresa.upsert as jest.Mock).mock.calls[0][0];
    expect(chamada.update.cnpj).toBe('');
    expect(chamada.update.telefone).toBe('');
    expect(chamada.update.email).toBe('');
  });

  it('retorna o resultado do upsert', async () => {
    const result = await svc.updateEmpresa(inputEmpresa);

    expect(result).toMatchObject({ id: 'singleton', razaoSocial: 'OMP Transportes' });
  });
});
