import crypto from 'crypto';
import { env } from '../../config/env';
import { IOtpStore, defaultOtpStore } from './otp.store';
import { IOtpProvider, defaultOtpProvider } from './otp.provider';

export interface GenerateOtpResult {
  success: boolean;
  message: string;
  cooldownRemainingSeconds?: number;
  expiresInSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  remainingAttempts?: number;
}

export class OtpService {
  constructor(
    private store: IOtpStore = defaultOtpStore,
    private provider: IOtpProvider = defaultOtpProvider,
    private expirySeconds: number = env.OTP_EXPIRY_SECONDS,
    private cooldownSeconds: number = env.OTP_RESEND_COOLDOWN_SECONDS,
    private maxAttempts: number = env.OTP_MAX_ATTEMPTS
  ) {}

  /**
   * Generates and dispatches a cryptographically secure 6-digit OTP to the phone number.
   * Enforces resend cooldown to protect against spam / abuse.
   */
  async generateAndSendOtp(phone: string): Promise<GenerateOtpResult> {
    const now = Date.now();
    const existing = await this.store.get(phone);

    // Enforce cooldown if an OTP was recently issued
    if (existing) {
      const elapsedSeconds = Math.floor((now - existing.createdAt) / 1000);
      if (elapsedSeconds < this.cooldownSeconds) {
        const remaining = this.cooldownSeconds - elapsedSeconds;
        return {
          success: false,
          message: `Please wait ${remaining} seconds before requesting a new OTP.`,
          cooldownRemainingSeconds: remaining,
        };
      }
    }

    // Cryptographically secure 6-digit OTP generation (100000 to 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();

    // Store OTP record
    await this.store.set({
      phone,
      otp,
      createdAt: now,
      expiresAt: now + this.expirySeconds * 1000,
      attempts: 0,
    });

    // Deliver OTP via configured provider
    await this.provider.sendOtp(phone, otp);

    return {
      success: true,
      message: 'OTP sent successfully.',
      expiresInSeconds: this.expirySeconds,
    };
  }

  /**
   * Verifies the provided OTP against the stored record.
   * Enforces expiration, attempt limits, and single-use invalidation.
   */
  async verifyOtp(phone: string, enteredOtp: string): Promise<VerifyOtpResult> {
    const record = await this.store.get(phone);

    if (!record) {
      return {
        success: false,
        message: 'OTP has expired or was not requested. Please request a new OTP.',
      };
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      await this.store.delete(phone);
      return {
        success: false,
        message: 'OTP has expired. Please request a new OTP.',
      };
    }

    // Increment attempts
    const totalAttempts = await this.store.incrementAttempts(phone);

    // Timing-safe comparison to prevent timing attacks
    const isLengthValid = enteredOtp.length === 6 && record.otp.length === 6;
    const isMatch =
      isLengthValid &&
      crypto.timingSafeEqual(Buffer.from(record.otp, 'utf8'), Buffer.from(enteredOtp, 'utf8'));

    if (!isMatch) {
      if (totalAttempts >= this.maxAttempts) {
        // Exceeded maximum allowed attempts -> invalidate immediately
        await this.store.delete(phone);
        return {
          success: false,
          message: 'Maximum verification attempts exceeded. Please request a new OTP.',
          remainingAttempts: 0,
        };
      }

      return {
        success: false,
        message: 'Invalid OTP entered.',
        remainingAttempts: this.maxAttempts - totalAttempts,
      };
    }

    // Verification successful: consume OTP immediately (single-use guarantee)
    await this.store.delete(phone);

    return {
      success: true,
      message: 'OTP verified successfully.',
    };
  }
}

export const defaultOtpService = new OtpService();
