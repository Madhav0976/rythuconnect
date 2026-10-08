import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import mongoose from 'mongoose';

/**
 * Validates express-validator results and returns standard 400 response.
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
 * Validates request payload for POST /api/delivery/estimate
 */
export const validateDeliveryEstimate = [
  body('listingId')
    .isString()
    .withMessage('Listing ID must be a string')
    .trim()
    .notEmpty()
    .withMessage('Listing ID is required')
    .custom((val) => {
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('Invalid listing ID format');
      }
      return true;
    }),

  body('destination')
    .optional()
    .custom((val) => {
      if (val === null || val === undefined) return true;
      if (typeof val !== 'object' || Array.isArray(val)) {
        throw new Error('Destination must be an object');
      }
      return true;
    }),

  body('destination.coordinates')
    .optional()
    .custom((val) => {
      if (val === null || val === undefined) return true;
      if (!Array.isArray(val)) {
        throw new Error('Coordinates must be an array: [longitude, latitude]');
      }
      if (val.length !== 2) {
        throw new Error('Coordinates array must contain exactly 2 numbers: [longitude, latitude]');
      }
      const [lng, lat] = val;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new Error('Coordinates must be numeric numbers, not strings or other types');
      }
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        throw new Error('Coordinates cannot be NaN or Infinity');
      }
      if (lng < -180 || lng > 180) {
        throw new Error('Longitude must be between -180 and 180');
      }
      if (lat < -90 || lat > 90) {
        throw new Error('Latitude must be between -90 and 90');
      }
      return true;
    }),

  handleValidationErrors,
];
