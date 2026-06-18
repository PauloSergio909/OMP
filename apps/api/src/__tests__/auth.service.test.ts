jest.mock('../config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$hashed$'),
  compare: jest.fn(),
}));

import { AuthService } from '../modules/auth/auth.service';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/app-error';

const mockFindUnique        = prisma.user.findUnique as jest.Mock;
const mockFindFirst         = prisma.user.findFirst as jest.Mock;
const mockFindUniqueOrThrow = prisma.user.findUniqueOrThrow as jest.Mock;
const mockFindMany          = prisma.user.findMany as jest.Mock;
const mockCreate            = prisma.user.create as jest.Mock;
const mockUpdate            = prisma.user.update as jest.Mock;
const mockCount             = prisma.user.count as jest.Mock;
const mockCompare           = bcrypt.compare as jest.Mock;

const svc = new AuthService();

beforeEach(() => { jest.clearAllMocks(); });

// ─── register ────────────────────────────────────────────────────────────────

describe('AuthService.register', () => {
  const input = { nome: 'João', email: 'joao@omp.com', senha: 'Senha@123' };

  it('lança AppError 409 quando email já cadastrado', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u-existing' });

    const err = await svc.register(input).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
    expect(err.message).toContain('Email já cadastrado');
  });

  it('cria usuário com role visualizador quando email disponível', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'u-new', email: input.email, nome: input.nome, role: 'visualizador' });

    await svc.register(input);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: input.email, role: 'visualizador' }),
      }),
    );
  });

  it('faz hash da senha antes de criar', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'u-new' });

    await svc.register(input);

    expect(bcrypt.hash).toHaveBeenCalledWith(input.senha, 12);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senhaHash: '$hashed$' }),
      }),
    );
  });
});

// ─── validateLogin ────────────────────────────────────────────────────────────

describe('AuthService.validateLogin', () => {
  const input = { email: 'joao@omp.com', senha: 'Senha@123' };
  const userBase = { id: 'u-1', email: input.email, nome: 'João', role: 'admin', ativo: true, senhaHash: '$real$', funcionarioId: null };

  it('retorna null quando usuário não existe', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCompare.mockResolvedValue(false);

    expect(await svc.validateLogin(input)).toBeNull();
  });

  it('retorna null quando usuário está inativo', async () => {
    mockFindUnique.mockResolvedValue({ ...userBase, ativo: false });
    mockCompare.mockResolvedValue(true);

    expect(await svc.validateLogin(input)).toBeNull();
  });

  it('retorna null quando senha incorreta', async () => {
    mockFindUnique.mockResolvedValue(userBase);
    mockCompare.mockResolvedValue(false);

    expect(await svc.validateLogin(input)).toBeNull();
  });

  it('retorna dados do usuário quando credenciais corretas', async () => {
    mockFindUnique.mockResolvedValue(userBase);
    mockCompare.mockResolvedValue(true);

    const result = await svc.validateLogin(input);

    expect(result).toEqual({ id: 'u-1', email: input.email, nome: 'João', role: 'admin', funcionarioId: null });
  });

  it('F4 — inclui funcionarioId quando usuário tem funcionário vinculado', async () => {
    mockFindUnique.mockResolvedValue({ ...userBase, funcionarioId: 'func-1' });
    mockCompare.mockResolvedValue(true);

    const result = await svc.validateLogin(input);

    expect(result).toMatchObject({ funcionarioId: 'func-1' });
  });

  it('executa bcrypt.compare mesmo quando usuário não existe (anti-timing)', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCompare.mockResolvedValue(false);

    await svc.validateLogin(input);

    expect(mockCompare).toHaveBeenCalledTimes(1);
  });
});

// ─── updateProfile ────────────────────────────────────────────────────────────

describe('AuthService.updateProfile', () => {
  const userId = 'u-1';
  const input = { nome: 'João Atualizado', email: 'novo@omp.com' };

  it('lança AppError 409 quando email pertence a outro usuário', async () => {
    mockFindFirst.mockResolvedValue({ id: 'u-other' });

    const err = await svc.updateProfile(userId, input).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
  });

  it('atualiza perfil quando email disponível', async () => {
    mockFindFirst.mockResolvedValue(null);
    mockUpdate.mockResolvedValue({ id: userId, ...input, role: 'admin' });

    await svc.updateProfile(userId, input);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: userId } }),
    );
  });
});

// ─── updatePassword ───────────────────────────────────────────────────────────

describe('AuthService.updatePassword', () => {
  const userId = 'u-1';
  const input = { senhaAtual: 'Antiga@123', novaSenha: 'Nova@456' };
  const userBase = { id: userId, senhaHash: '$hash$' };

  it('lança AppError 400 quando senha atual incorreta', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(userBase);
    mockCompare.mockResolvedValue(false);

    const err = await svc.updatePassword(userId, input).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(400);
    expect(err.message).toBe('Senha atual incorreta');
  });

  it('atualiza senha quando senha atual correta', async () => {
    mockFindUniqueOrThrow.mockResolvedValue(userBase);
    mockCompare.mockResolvedValue(true);
    mockUpdate.mockResolvedValue({});

    await svc.updatePassword(userId, input);

    expect(bcrypt.hash).toHaveBeenCalledWith(input.novaSenha, 12);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: userId },
        data: expect.objectContaining({ senhaHash: '$hashed$' }),
      }),
    );
  });
});

// ─── criarUsuario ─────────────────────────────────────────────────────────────

describe('AuthService.criarUsuario', () => {
  const input = { nome: 'Admin', email: 'admin@omp.com', senha: 'Admin@123', role: 'admin' };

  it('lança AppError 409 quando email já existe', async () => {
    mockFindUnique.mockResolvedValue({ id: 'u-existing' });

    const err = await svc.criarUsuario(input).catch((e) => e);

    expect(err).toBeInstanceOf(AppError);
    expect(err.statusCode).toBe(409);
  });

  it('cria usuário com role informada pelo admin', async () => {
    mockFindUnique.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'u-new', ...input });

    await svc.criarUsuario(input);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'admin' }),
      }),
    );
  });
});

// ─── atualizarUsuario — hashing condicional de senha ─────────────────────────

describe('AuthService.atualizarUsuario', () => {
  const userRetorno = { id: 'u-1', email: 'a@b.com', nome: 'Admin', role: 'admin', ativo: true };

  beforeEach(() => {
    mockUpdate.mockResolvedValue(userRetorno);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$hashed_nova$');
  });

  it('faz hash da nova senha quando fornecida', async () => {
    await svc.atualizarUsuario('u-1', { senha: 'nova123' });

    expect(bcrypt.hash).toHaveBeenCalledWith('nova123', 12);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ senhaHash: '$hashed_nova$' }),
      }),
    );
  });

  it('não inclui senhaHash quando senha não é fornecida', async () => {
    await svc.atualizarUsuario('u-1', { role: 'visualizador' });

    expect(bcrypt.hash).not.toHaveBeenCalled();
    const chamada = mockUpdate.mock.calls[0][0];
    expect(chamada.data).not.toHaveProperty('senhaHash');
  });

  it('atualiza role e ativo sem mexer na senha', async () => {
    await svc.atualizarUsuario('u-1', { role: 'mecanico', ativo: false });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u-1' },
        data: expect.objectContaining({ role: 'mecanico', ativo: false }),
      }),
    );
  });
});

// ─── listarUsuarios — construção do where ─────────────────────────────────────

describe('AuthService.listarUsuarios', () => {
  const paginacao = { page: 1, perPage: 20, search: '', orderBy: 'nome', order: 'asc' as const };
  const userRow = { id: 'u-1', nome: 'João', email: 'joao@omp.com', role: 'admin', ativo: true, createdAt: new Date(), funcionario: null };

  beforeEach(() => {
    mockFindMany.mockResolvedValue([userRow]);
    mockCount.mockResolvedValue(1);
  });

  it('where vazio quando search não fornecido', async () => {
    await svc.listarUsuarios(paginacao);

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where).toEqual({});
  });

  it('aplica OR de busca em nome e email quando search fornecido', async () => {
    await svc.listarUsuarios({ ...paginacao, search: 'joao' });

    const chamada = mockFindMany.mock.calls[0][0];
    expect(chamada.where.OR).toHaveLength(2);
    expect(chamada.where.OR[0]).toMatchObject({ nome: { contains: 'joao' } });
    expect(chamada.where.OR[1]).toMatchObject({ email: { contains: 'joao' } });
  });

  it('retorna usuarios e total', async () => {
    const result = await svc.listarUsuarios(paginacao);

    expect(result.usuarios).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});
