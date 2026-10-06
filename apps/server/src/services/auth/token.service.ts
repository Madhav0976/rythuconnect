import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthTokenPayload, UserRole } from '@rythuconnect/types';
import { env } from '../../config/env';

export class TokenService {
  private secret: string;
  private expiresIn: string;

  constructor(secret: string = env.JWT_SECRET, expiresIn: string = env.JWT_ACCESS_EXPIRES_IN) {
    if (!secret) {
      throw new Error('[TokenService] JWT Secret must be provided.');
    }
    this.secret = secret;
    this.expiresIn = expiresIn;
  }

  /**
   * Signs a stateless JWT access token containing only minimal identity data (userId, role).
   */
  signAccessToken(payload: AuthTokenPayload): string {
    const options: SignOptions = {
      expiresIn: this.expiresIn as any,
    };

    return jwt.sign(
      {
        userId: payload.userId,
        role: payload.role,
      },
      this.secret,
      options
    );
  }

  /**
   * Cryptographically verifies the JWT token and extracts the authenticated identity payload.
   * Throws Error if expired, invalid, or forged.
   */
  verifyAccessToken(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as any;

      if (!decoded || !decoded.userId || !decoded.role) {
        throw new Error('Malformed token payload');
      }

      if (!Object.values(UserRole).includes(decoded.role)) {
        throw new Error('Invalid user role in token');
      }

      return {
        userId: decoded.userId,
        role: decoded.role as UserRole,
      };
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        const error = new Error('Token has expired');
        (error as any).code = 'TOKEN_EXPIRED';
        throw error;
      }
      const error = new Error('Invalid authentication token');
      (error as any).code = 'TOKEN_INVALID';
      throw error;
    }
  }
}

export const defaultTokenService = new TokenService();
