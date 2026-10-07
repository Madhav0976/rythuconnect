import { Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { DeliveryType, QuantityUnit, ListingStatus } from '@rythuconnect/types';

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
 * Validates HTTP/HTTPS image URL format.
 */
function isValidImageUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length > 500) {
    return false;
  }
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Validates standard 24-character hexadecimal MongoDB ObjectId in params
 */
export const validateListingId = [
  param('id')
    .trim()
    .notEmpty()
    .withMessage('Listing ID is required')
    .custom((val) => {
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('Invalid listing ID format');
      }
      return true;
    }),
  handleValidationErrors,
];

/**
 * Validator for POST /api/listings
 */
export const validateCreateListing = [
  body('cropName')
    .trim()
    .notEmpty()
    .withMessage('Crop name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Crop name must be between 2 and 100 characters'),

  body('categoryId')
    .trim()
    .notEmpty()
    .withMessage('Category ID is required')
    .custom((val) => {
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    }),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number greater than 0'),

  body('quantityUnit')
    .trim()
    .notEmpty()
    .withMessage('Quantity unit is required')
    .isIn(Object.values(QuantityUnit))
    .withMessage(`Quantity unit must be one of [${Object.values(QuantityUnit).join(', ')}]`),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a finite positive number greater than 0'),

  body('harvestDate')
    .notEmpty()
    .withMessage('Harvest date is required')
    .isISO8601()
    .toDate()
    .withMessage('Harvest date must be a valid ISO 8601 date'),

  body('deliveryType')
    .trim()
    .notEmpty()
    .withMessage('Delivery type is required')
    .isIn(Object.values(DeliveryType))
    .withMessage(`Delivery type must be one of [${Object.values(DeliveryType).join(', ')}]`),

  body('deliveryCharge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Delivery charge must be a non-negative number'),

  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),

  body('coordinates')
    .optional()
    .custom((val) => {
      if (!val) return true;
      if (typeof val !== 'object' || val.type !== 'Point' || !Array.isArray(val.coordinates)) {
        throw new Error('Coordinates must be GeoJSON Point with [longitude, latitude]');
      }
      if (val.coordinates.length !== 2) {
        throw new Error('Coordinates must contain exactly 2 numbers: [longitude, latitude]');
      }
      const [lng, lat] = val.coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        throw new Error('Coordinates must contain numeric longitude and latitude');
      }
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Coordinates out of range: longitude [-180, 180], latitude [-90, 90]');
      }
      return true;
    }),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Images must be an array with at most 5 items')
    .custom((arr) => {
      if (!arr) return true;
      for (const item of arr) {
        if (!isValidImageUrl(item)) {
          throw new Error('Each image must be a valid http or https URL (max 500 characters)');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validator for PATCH /api/listings/:id
 */
export const validateUpdateListing = [
  body('cropName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Crop name must be between 2 and 100 characters'),

  body('categoryId')
    .optional()
    .trim()
    .custom((val) => {
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    }),

  body('quantity')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number greater than 0'),

  body('quantityUnit')
    .optional()
    .trim()
    .isIn(Object.values(QuantityUnit))
    .withMessage(`Quantity unit must be one of [${Object.values(QuantityUnit).join(', ')}]`),

  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a finite positive number greater than 0'),

  body('harvestDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Harvest date must be a valid ISO 8601 date'),

  body('deliveryType')
    .optional()
    .trim()
    .isIn(Object.values(DeliveryType))
    .withMessage(`Delivery type must be one of [${Object.values(DeliveryType).join(', ')}]`),

  body('deliveryCharge')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Delivery charge must be a non-negative number'),

  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),

  body('coordinates')
    .optional()
    .custom((val) => {
      if (!val) return true;
      if (typeof val !== 'object' || val.type !== 'Point' || !Array.isArray(val.coordinates)) {
        throw new Error('Coordinates must be GeoJSON Point with [longitude, latitude]');
      }
      if (val.coordinates.length !== 2) {
        throw new Error('Coordinates must contain exactly 2 numbers: [longitude, latitude]');
      }
      const [lng, lat] = val.coordinates;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) {
        throw new Error('Coordinates must contain numeric longitude and latitude');
      }
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new Error('Coordinates out of range: longitude [-180, 180], latitude [-90, 90]');
      }
      return true;
    }),

  body('images')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Images must be an array with at most 5 items')
    .custom((arr) => {
      if (!arr) return true;
      for (const item of arr) {
        if (!isValidImageUrl(item)) {
          throw new Error('Each image must be a valid http or https URL (max 500 characters)');
        }
      }
      return true;
    }),

  handleValidationErrors,
];

/**
 * Validator for PATCH /api/listings/:id/status
 */
export const validateUpdateStatus = [
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .equals(ListingStatus.SOLD)
    .withMessage(`Farmers may only transition listings to ${ListingStatus.SOLD}`),

  handleValidationErrors,
];
