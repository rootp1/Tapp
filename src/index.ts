
import dotenv from 'dotenv';
dotenv.config();

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { connectDatabase } from './config/database';
import { logger } from './utils/logger';
import postsRouter from './routes/posts';
import paymentsRouter from './routes/payments';
import adminRouter from './routes/admin';
import { tappBot } from './bot/index';

const app: Express = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use(tappBot.webhookCallback('/webhook/telegram'));

app.use('/api/posts', postsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Tapp API',
    version: '1.0.0',
    description: 'Telegram + TON micropayment platform',
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, req: Request, res: Response, next: Function) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const startServer = async () => {
  try {

    await connectDatabase();

    app.listen(PORT, async () => {
      logger.info(`Tapp API server running on port ${PORT}`);

      if (process.env.NODE_ENV !== 'test') {
        try {
          await tappBot.launchWebhook();
        } catch (error) {
          logger.error('Bot webhook setup failed:', error);
          logger.info('Server is still running, but bot is unavailable');
        }
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

startServer();

export default app;
