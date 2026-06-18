import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  // Redis não é utilizado atualmente — mantido como opcional para uso futuro
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(10),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ALLOWED_ORIGIN: z.string().url().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('FleetMaster <noreply@fleetmaster.local>'),
  ALERTAS_EMAIL_DEST: z.string().email().optional(),
  ALERTAS_INTERVALO_HORAS: z.coerce.number().int().min(1).default(24),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Variáveis de ambiente inválidas:');
  console.error(parsed.error.format());
  process.exit(1); 
}

export const env = parsed.data;
