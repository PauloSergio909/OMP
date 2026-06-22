import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.user.count();
  if (count === 0) {
    console.log('🌱 Banco vazio — executando seed inicial...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', cwd: path.resolve(__dirname, '..') });
    console.log('✅ Seed concluído.');
  } else {
    console.log(`✅ Banco já possui ${count} usuário(s) — seed ignorado.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
