import { createAdapter } from '@socket.io/redis-adapter';
import http from 'http';
import { Server } from 'socket.io';
import app from './server';
import { env } from './config/env';
import { pubClient, subClient } from './config/redis';
import { setupSockets } from './sockets';
import { logger } from './utils/logger';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Conditionally attach Redis adapter for horizontal scaling
if (env.REDIS_ENABLED === 'true') {
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Redis adapter attached for horizontal scaling');
} else {
  logger.info('Running with in-memory adapter (single node mode)');
}

// Setup socket event connections
setupSockets(io);

// Start server
server.listen(env.PORT, () => {
  logger.info(`🚀 Signaling Server started in [${env.NODE_ENV}] mode on port ${env.PORT}`);
});

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  logger.error('CRITICAL: Uncaught Exception', error);
});

process.on('unhandledRejection', (reason) => {
  logger.error('CRITICAL: Unhandled Promise Rejection', reason);
});
