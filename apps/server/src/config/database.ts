import mongoose from 'mongoose';
import { env } from './env';

export interface DatabaseStatus {
  isConnected: boolean;
  host?: string;
  name?: string;
  error?: string;
}

let isConnected = false;

/**
 * Connect to MongoDB database using Mongoose.
 * Uses a 3-second timeout for server selection so local development can proceed
 * even if MongoDB is not yet running, while reporting failure clearly.
 */
export async function connectDatabase(): Promise<DatabaseStatus> {
  if (isConnected) {
    return {
      isConnected: true,
      host: mongoose.connection.host,
      name: mongoose.connection.name,
    };
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return {
      isConnected: true,
      host: conn.connection.host,
      name: conn.connection.name,
    };
  } catch (err: any) {
    isConnected = false;
    const errorMessage = err?.message || 'Unknown database connection error';
    console.error(`[Database] MongoDB connection failed: ${errorMessage}`);
    console.warn('[Database] Server will continue running without database connectivity. Check MONGODB_URI.');
    return {
      isConnected: false,
      error: errorMessage,
    };
  }
}

/**
 * Disconnect from MongoDB gracefully.
 */
export async function disconnectDatabase(): Promise<void> {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected cleanly.');
  } catch (err: any) {
    console.error('[Database] Error while disconnecting MongoDB:', err?.message || err);
  }
}

/**
 * Get current database connection status.
 */
export function getDatabaseStatus(): DatabaseStatus {
  const readyState = mongoose.connection.readyState;
  // 1 = connected
  const connected = readyState === 1;
  return {
    isConnected: connected,
    host: connected ? mongoose.connection.host : undefined,
    name: connected ? mongoose.connection.name : undefined,
  };
}
