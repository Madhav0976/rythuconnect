import { apiClient, ApiError } from '@/lib/api/client';
import {
  AuthResponseData,
  AuthUser,
  SendOtpRequest,
  VerifyOtpRequest,
  ApiResponse,
  UserRole,
  LanguageCode,
} from '@rythuconnect/types';

export interface SendOtpResult {
  success: boolean;
  message: string;
  phone?: string;
  cooldownSeconds?: number;
  retryAfterSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  data?: AuthResponseData;
  remainingAttempts?: number;
}

export const authService = {
  /**
   * Request an OTP dispatched to the provided Indian phone number.
   * Handles 429 rate limit / cooldown responses gracefully.
   */
  async sendOtp(phone: string): Promise<SendOtpResult> {
    try {
      const payload: SendOtpRequest = { phone };
      const res = await apiClient<ApiResponse<{ phone: string; cooldownSeconds: number }>>(
        '/auth/send-otp',
        {
          method: 'POST',
          body: payload,
        }
      );

      return {
        success: true,
        message: res.message || 'OTP sent successfully',
        phone: res.data?.phone,
        cooldownSeconds: res.data?.cooldownSeconds || 60,
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return {
          success: false,
          message: err.message,
          retryAfterSeconds: (err.data as Record<string, unknown>)?.retryAfterSeconds as number | undefined,
        };
      }
      return {
        success: false,
        message: 'Unable to send OTP. Please check your connection and try again.',
      };
    }
  },

  /**
   * Verify the 6-digit OTP and obtain authenticated session credentials.
   */
  async verifyOtp(params: {
    phone: string;
    otp: string;
    role?: UserRole.FARMER | UserRole.BUYER;
    preferredLanguage?: LanguageCode;
  }): Promise<VerifyOtpResult> {
    try {
      const payload: VerifyOtpRequest = {
        phone: params.phone,
        otp: params.otp,
        ...(params.role ? { role: params.role } : {}),
        ...(params.preferredLanguage ? { preferredLanguage: params.preferredLanguage } : {}),
      };

      const res = await apiClient<ApiResponse<AuthResponseData>>('/auth/verify-otp', {
        method: 'POST',
        body: payload,
      });

      return {
        success: true,
        message: res.message || 'Verification successful',
        data: res.data,
      };
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return {
          success: false,
          message: err.message,
          remainingAttempts: (err.data as Record<string, unknown>)?.remainingAttempts as number | undefined,
        };
      }
      return {
        success: false,
        message: 'Verification failed. Please try again.',
      };
    }
  },

  /**
   * Fetch current authenticated user identity using stored Bearer token.
   */
  async getMe(): Promise<AuthUser | null> {
    try {
      const res = await apiClient<ApiResponse<{ user: AuthUser }>>('/auth/me', {
        method: 'GET',
      });
      return res.data?.user || null;
    } catch {
      return null;
    }
  },

  /**
   * Conclude authenticated session on server.
   */
  async logout(): Promise<void> {
    try {
      await apiClient<ApiResponse>('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Best effort server logout; client state is cleared regardless
    }
  },
};
