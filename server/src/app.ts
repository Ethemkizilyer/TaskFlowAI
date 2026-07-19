import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';

import { config } from './config';
import authRoutes from './routes/authRoutes';
import boardRoutes from './routes/boardRoutes';
import aiRoutes from './routes/aiRoutes';
import userRoutes from './routes/userRoutes';
import messageRoutes from './routes/messageRoutes';
import searchRoutes from './routes/searchRoutes';
import focusRoutes from './routes/focusRoutes';
import automationRoutes from './routes/automationRoutes';
import moodRoutes from './routes/moodRoutes';
import timeTrackingRoutes from './routes/timeTrackingRoutes';
import settingsRoutes from './routes/settingsRoutes';
import { notFound, errorHandler } from './middleware/errorHandler';

const app = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: config.isProduction ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(
  cors({
    origin: config.clientUrl,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (!config.isProduction) {
  app.use(morgan('dev'));
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api', apiLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many auth attempts, please try again later' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/automations', automationRoutes);
app.use('/api/mood', moodRoutes);
app.use('/api/time-tracking', timeTrackingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api', searchRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
