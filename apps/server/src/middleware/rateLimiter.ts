import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs: number; // Duration in milliseconds
  max: number; // Max requests allowed within window
  message?: string;
}

/**
 * Lightweight In-Memory Rate Limiter (Development & Single-Instance baseline).
 * Prevents rapid abuse of public auth endpoints.
 * NOTE: For distributed multi-instance production environments, replace with Redis rate limiter.
 */
export function createRateLimiter(options: RateLimiterOptions) {
  const store = new Map<string, RateLimitEntry>();
  const { windowMs, max, message = 'Too many requests. Please try again later.' } = options;

  // Periodic cleanup every 60 seconds
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(key);
      }
    }
  }, 60000);
  cleanupInterval.unref();

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetTime) {
      store.set(ip, {
        count: 1,
        resetTime: now + windowMs,
      });
      next();
      return;
    }

    if (entry.count >= max) {
      const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        message,
        retryAfterSeconds,
      });
      return;
    }

    entry.count += 1;
    next();
  };
}
