import { Request, Response, NextFunction } from 'express';
import { AuthTokenPayload } from '@rythuconnect/types';
import { defaultTokenService, TokenService } from '../services/auth/token.service';

// Extend Express Request with authenticated user payload
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

export function createAuthMiddleware(tokenService: TokenService = defaultTokenService) {
  return function requireAuth(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Authorization header is missing.',
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1].trim()) {
      res.status(401).json({
        success: false,
        message: 'Malformed authorization header. Format must be "Bearer <token>".',
      });
      return;
    }

    const token = parts[1].trim();

    try {
      const payload = tokenService.verifyAccessToken(token);
      req.user = payload;
      next();
    } catch (err: any) {
      const message = err.code === 'TOKEN_EXPIRED' ? 'Authentication token has expired.' : 'Invalid authentication token.';
      res.status(401).json({
        success: false,
        message,
      });
    }
  };
}

export const requireAuth = createAuthMiddleware();
