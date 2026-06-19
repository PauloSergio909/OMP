import winston from 'winston';
import { env } from '../config/env';

const consoleFormat = env.NODE_ENV === 'development'
  ? winston.format.combine(winston.format.colorize(), winston.format.simple())
  : winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.json());

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
  ],
});
