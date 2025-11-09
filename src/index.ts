// Load environment variables FIRST before any other imports
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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Telegram Bot Webhook - must be before other routes
app.use(tappBot.webhookCallback('/webhook/telegram'));

// Routes
app.use('/api/posts', postsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/admin', adminRouter);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Tapp API',
    version: '1.0.0',
    description: 'Telegram + TON micropayment platform',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: Function) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start Express server
    app.listen(PORT, async () => {
      logger.info(`Tapp API server running on port ${PORT}`);
      
      // Start Telegram bot with webhook (in the same process)
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

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
