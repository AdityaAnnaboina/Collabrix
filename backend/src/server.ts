import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import routes from './routes';
import { logger } from './utils/logger';

const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: env.NODE_ENV === 'production',
  })
);

// CORS configuration
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Base api router
app.use('/api', routes);

// 404 Route handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error handler middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled request exception', err, {
    path: req.path,
    method: req.method,
  });
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

export default app;
