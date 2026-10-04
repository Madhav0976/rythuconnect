import { Request, Response } from 'express';
import { getDatabaseStatus } from '../config/database';
import { env } from '../config/env';

export function getHealth(req: Request, res: Response): void {
  const dbStatus = getDatabaseStatus();

  res.status(200).json({
    success: true,
    message: 'RythuConnect API is healthy',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: {
      connected: dbStatus.isConnected,
    },
  });
}
