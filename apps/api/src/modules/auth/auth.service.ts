import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import type { Prisma } from '@prisma/client';
import type { LoginInput, RegisterInput, CreateUserByAdminInput, UpdateProfileInput, UpdatePasswordInput, PaginationInput } from '@fleetmaster/shared';
import { AppError } from '../../utils/app-error';

export class AuthService {
  async register(data: RegisterInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });

    if (existingUser) {
      throw new AppError('Email já cadastrado no sistema', 409);
    }

    const senhaHash = await bcrypt.hash(data.senha, 12);

    return prisma.user.create({
      data: {
        email: data.email,
        nome: data.nome,
        senhaHash,
        role: 'visualizador',
      },
      select: { id: true, email: true, nome: true, role: true, createdAt: true },
    });
  }

  async validateLogin(data: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Always run bcrypt.compare to prevent timing-based email enumeration
    const dummyHash = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8e2';
    const senhaValida = await bcrypt.compare(data.senha, user?.senhaHash ?? dummyHash);

    if (!user || !user.ativo || !senhaValida) return null;

    return { id: user.id, email: user.email, nome: user.nome, role: user.role, funcionarioId: user.funcionarioId };
  }

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, nome: true, role: true, ativo: true, funcionarioId: true },
    });
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const existing = await prisma.user.findFirst({ where: { email: data.email, id: { not: userId } } });
    if (existing) throw new AppError('E-mail já está em uso por outro usuário', 409);

    return prisma.user.update({
      where: { id: userId },
      data: { nome: data.nome, email: data.email },
      select: { id: true, nome: true, email: true, role: true },
    });
  }

  async updatePassword(userId: string, data: UpdatePasswordInput) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const senhaCorreta = await bcrypt.compare(data.senhaAtual, user.senhaHash);
    if (!senhaCorreta) throw new AppError('Senha atual incorreta', 400);

    const senhaHash = await bcrypt.hash(data.novaSenha, 12);
    await prisma.user.update({ where: { id: userId }, data: { senhaHash } });
  }

  async listarUsuarios(params: PaginationInput) {
    const { page, perPage, search } = params;
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { nome: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [usuarios, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, nome: true, email: true, role: true, ativo: true, createdAt: true,
          funcionario: { select: { id: true, nome: true, cargo: true } },
        },
        orderBy: { nome: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.user.count({ where }),
    ]);
    return { usuarios, total };
  }

  async criarUsuario(data: CreateUserByAdminInput) {
    const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
    if (existingUser) throw new AppError('Email já cadastrado no sistema', 409);

    const senhaHash = await bcrypt.hash(data.senha, 12);

    return prisma.user.create({
      data: { email: data.email, nome: data.nome, senhaHash, role: data.role, funcionarioId: data.funcionarioId ?? null },
      select: { id: true, email: true, nome: true, role: true, ativo: true, createdAt: true },
    });
  }

  async atualizarUsuario(id: string, data: { role?: string; ativo?: boolean; senha?: string }) {
    const updateData: { role?: string; ativo?: boolean; senhaHash?: string } = {};
    if (data.role) updateData.role = data.role;
    if (data.ativo !== undefined) updateData.ativo = data.ativo;
    if (data.senha) updateData.senhaHash = await bcrypt.hash(data.senha, 12);

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, nome: true, role: true, ativo: true },
    });
  }
}
