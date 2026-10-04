import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

async function bootstrap() {
  console.log(`[RythuConnect] Starting server in ${env.NODE_ENV} mode...`);

  // Start HTTP server immediately so APIs (like /api/health) are responsive
  const server = app.listen(env.PORT, () => {
    console.log(`[RythuConnect] Backend API listening on port ${env.PORT}`);
    console.log(`[RythuConnect] Health check available at: http://localhost:${env.PORT}/api/health`);
  });

  // Attempt database connection in background
  connectDatabase().catch((err) => {
    console.error('[RythuConnect] Initial database connection attempt failed:', err.message);
  });

  // Graceful shutdown handling
  const shutdown = async (signal: string) => {
    console.log(`\n[RythuConnect] Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.log('[RythuConnect] HTTP server closed.');
      await disconnectDatabase();
      console.log('[RythuConnect] Graceful shutdown complete.');
      process.exit(0);
    });

    // Force shutdown after timeout if pending connections hang
    setTimeout(() => {
      console.error('[RythuConnect] Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((err) => {
  console.error('[RythuConnect] Fatal startup error:', err);
  process.exit(1);
});
