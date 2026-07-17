import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-me';
if (jwtSecret === 'fallback-secret-change-me' && process.env.NODE_ENV === 'production') {
  console.error('[FATAL] JWT_SECRET must be set in production. Using fallback is insecure.');
  process.exit(1);
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  isProduction: process.env.NODE_ENV === 'production',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  email: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'noreply@taskflow.ai',
  },
};
