import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { UserRole, LanguageCode } from '@rythuconnect/types';
import { normalizePhoneNumber } from '../utils/phone';

/**
 * Middleware collecting express-validator results and returning uniform error responses.
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: (err as any).path || (err as any).param,
        message: err.msg,
      })),
    });
    return;
  }
  next();
}

/**
 * Validator for POST /api/auth/send-otp
 */
export const validateSendOtp = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((val) => {
      const normalized = normalizePhoneNumber(val);
      if (!normalized) {
        throw new Error('Please enter a valid phone number (10-15 digits)');
      }
      return true;
    }),
  handleValidationErrors,
];

/**
 * Validator for POST /api/auth/verify-otp
 */
export const validateVerifyOtp = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .custom((val) => {
      const normalized = normalizePhoneNumber(val);
      if (!normalized) {
        throw new Error('Please enter a valid phone number (10-15 digits)');
      }
      return true;
    }),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be a 6-digit numeric code'),
  body('role')
    .optional()
    .trim()
    .custom((val) => {
      if (val === UserRole.ADMIN) {
        throw new Error('Admin role cannot be self-assigned through public registration.');
      }
      if (![UserRole.FARMER, UserRole.BUYER].includes(val)) {
        throw new Error(`Role must be either ${UserRole.FARMER} or ${UserRole.BUYER}`);
      }
      return true;
    }),
  body('preferredLanguage')
    .optional()
    .trim()
    .isIn(Object.values(LanguageCode))
    .withMessage(`Preferred language must be one of [${Object.values(LanguageCode).join(', ')}]`),
  handleValidationErrors,
];
