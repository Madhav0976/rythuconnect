import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { UserRole, LanguageCode, AuthResponseData, AuthUser } from '@rythuconnect/types';
import { normalizePhoneNumber } from '../utils/phone';
import { defaultOtpService, OtpService } from '../services/auth/otp.service';
import { defaultTokenService, TokenService } from '../services/auth/token.service';
import { User, FarmerProfile, BuyerProfile } from '../models';
import { env } from '../config/env';

export class AuthController {
  constructor(
    private otpService: OtpService = defaultOtpService,
    private tokenService: TokenService = defaultTokenService
  ) {}

  /**
   * POST /api/auth/send-otp
   * Generates and dispatches a 6-digit OTP to the phone number with resend cooldown.
   */
  sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const normalizedPhone = normalizePhoneNumber(req.body.phone);
      if (!normalizedPhone) {
        res.status(400).json({
          success: false,
          message: 'Please enter a valid phone number (10-15 digits)',
        });
        return;
      }

      const result = await this.otpService.generateAndSendOtp(normalizedPhone);

      if (!result.success) {
        // Cooldown active
        res.status(429).json({
          success: false,
          message: result.message,
          retryAfterSeconds: result.cooldownRemainingSeconds,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phone: normalizedPhone,
          cooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
          expiresInSeconds: result.expiresInSeconds,
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/verify-otp
   * Verifies the OTP, provisions or looks up the User account, and issues a JWT token.
   */
  verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const normalizedPhone = normalizePhoneNumber(req.body.phone);
      const { otp, role, preferredLanguage } = req.body;

      if (!normalizedPhone) {
        res.status(400).json({
          success: false,
          message: 'Please enter a valid phone number (10-15 digits)',
        });
        return;
      }

      // Verify OTP
      const otpResult = await this.otpService.verifyOtp(normalizedPhone, otp);

      if (!otpResult.success) {
        res.status(400).json({
          success: false,
          message: otpResult.message,
          ...(otpResult.remainingAttempts !== undefined && {
            remainingAttempts: otpResult.remainingAttempts,
          }),
        });
        return;
      }

      // Security check: public authentication must never allow ADMIN role self-assignment
      if (role === UserRole.ADMIN) {
        res.status(400).json({
          success: false,
          message: 'Admin role cannot be self-assigned through public registration.',
        });
        return;
      }

      // Check database readiness
      const isDbConnected = mongoose.connection.readyState === 1;
      if (!isDbConnected) {
        res.status(503).json({
          success: false,
          message: 'Database service is currently unavailable. Please try again shortly.',
        });
        return;
      }

      // Find or create user
      let user = await User.findOne({ phone: normalizedPhone });

      if (user) {
        // Role immutability enforcement:
        // Existing user's stored role in database is authoritative and immutable via verify-otp request.
        if (role && role !== user.role) {
          res.status(400).json({
            success: false,
            message: `Role mismatch: This phone number is already registered as ${user.role}. Cannot change role to ${role}.`,
          });
          return;
        }

        // Existing user: mark as verified if needed
        if (!user.isVerified) {
          user.isVerified = true;
          await user.save();
        }
      } else {
        // New user registration: enforce non-admin role
        const chosenRole: UserRole =
          role === UserRole.FARMER ? UserRole.FARMER : UserRole.BUYER;
        const chosenLang: LanguageCode = Object.values(LanguageCode).includes(preferredLanguage)
          ? preferredLanguage
          : LanguageCode.EN;

        user = await User.create({
          phone: normalizedPhone,
          role: chosenRole,
          preferredLanguage: chosenLang,
          isVerified: true,
        });
      }

      // Ensure 1:1 Profile exists for the user without duplicates or accidental admin profiles
      if (user.role === UserRole.FARMER) {
        const existingFarmerProfile = await FarmerProfile.findOne({ userId: user._id });
        if (!existingFarmerProfile) {
          const farmLocation =
            typeof req.body.farmLocation === 'string' && req.body.farmLocation.trim().length >= 2
              ? req.body.farmLocation.trim()
              : 'Pending profile update';
          await FarmerProfile.create({
            userId: user._id,
            farmLocation,
            ...(req.body.coordinates ? { coordinates: req.body.coordinates } : {}),
          });
        }
      } else if (user.role === UserRole.BUYER) {
        const existingBuyerProfile = await BuyerProfile.findOne({ userId: user._id });
        if (!existingBuyerProfile) {
          const deliveryAddress =
            typeof req.body.deliveryAddress === 'string' && req.body.deliveryAddress.trim().length >= 5
              ? req.body.deliveryAddress.trim()
              : 'Pending profile update';
          const businessName =
            typeof req.body.businessName === 'string' && req.body.businessName.trim().length > 0
              ? req.body.businessName.trim()
              : undefined;
          await BuyerProfile.create({
            userId: user._id,
            deliveryAddress,
            ...(businessName ? { businessName } : {}),
          });
        }
      }
      // Note: If user.role is ADMIN, no FarmerProfile or BuyerProfile is created.

      // Issue JWT token
      const token = this.tokenService.signAccessToken({
        userId: user.id,
        role: user.role,
      });

      const authUser: AuthUser = {
        id: user.id,
        phone: user.phone,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        isVerified: user.isVerified,
      };

      const responseData: AuthResponseData = {
        token,
        user: authUser,
      };

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: responseData,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/auth/me
   * Returns current authenticated user identity.
   */
  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
        return;
      }

      const isDbConnected = mongoose.connection.readyState === 1;
      if (isDbConnected) {
        const user = await User.findById(req.user.userId);
        if (!user) {
          res.status(404).json({
            success: false,
            message: 'User account not found',
          });
          return;
        }

        res.status(200).json({
          success: true,
          message: 'User profile retrieved successfully',
          data: {
            user: {
              id: user.id,
              phone: user.phone,
              role: user.role,
              preferredLanguage: user.preferredLanguage,
              isVerified: user.isVerified,
            },
          },
        });
        return;
      }

      // Fallback when DB is offline (returns verified token claims)
      res.status(200).json({
        success: true,
        message: 'Authenticated session active',
        data: {
          user: {
            id: req.user.userId,
            role: req.user.role,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/auth/logout
   * Concludes client session. Stateless JWT tokens are removed on the client.
   * Full server-side token blacklisting is reserved for multi-token refresh architecture.
   */
  logout = async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      message: 'Logged out successfully. Please discard the client authentication token.',
    });
  };
}

export const defaultAuthController = new AuthController();
