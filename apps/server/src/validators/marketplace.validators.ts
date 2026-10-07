import { Request, Response, NextFunction } from 'express';
import { query, param, validationResult } from 'express-validator';
import mongoose from 'mongoose';

const ALLOWED_SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'harvest_date'] as const;

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
 * Validates standard 24-character hexadecimal MongoDB ObjectId in params
 */
export const validateMarketplaceListingId = [
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
 * Validates query parameters for GET /api/marketplace/listings
 */
export const validateMarketplaceQuery = [
  query('search')
    .optional()
    .isString()
    .withMessage('Search query must be a string')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),

  query('categoryId')
    .optional()
    .isString()
    .withMessage('Category ID must be a string')
    .trim()
    .custom((val) => {
      if (!val) return true;
      if (!mongoose.Types.ObjectId.isValid(val)) {
        throw new Error('Invalid category ID format');
      }
      return true;
    }),

  query('minPrice')
    .optional()
    .isString()
    .withMessage('minPrice must be a string')
    .custom((val) => {
      if (val === undefined || val === '') return true;
      const num = Number(val);
      if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
        throw new Error('minPrice must be a finite non-negative number');
      }
      if (num > 10000000) {
        throw new Error('minPrice cannot exceed 10,000,000');
      }
      return true;
    }),

  query('maxPrice')
    .optional()
    .isString()
    .withMessage('maxPrice must be a string')
    .custom((val) => {
      if (val === undefined || val === '') return true;
      const num = Number(val);
      if (Number.isNaN(num) || !Number.isFinite(num) || num < 0) {
        throw new Error('maxPrice must be a finite non-negative number');
      }
      if (num > 10000000) {
        throw new Error('maxPrice cannot exceed 10,000,000');
      }
      return true;
    }),

  query('minPrice')
    .optional()
    .custom((minVal, { req }) => {
      if (minVal !== undefined && minVal !== '' && req.query?.maxPrice !== undefined && req.query.maxPrice !== '') {
        const min = Number(minVal);
        const max = Number(req.query.maxPrice);
        if (Number.isFinite(min) && Number.isFinite(max) && min > max) {
          throw new Error('minPrice cannot be greater than maxPrice');
        }
      }
      return true;
    }),

  query('location')
    .optional()
    .isString()
    .withMessage('Location filter must be a string')
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location filter cannot exceed 100 characters'),

  query('sort')
    .optional()
    .isString()
    .withMessage('Sort option must be a string')
    .trim()
    .isIn(ALLOWED_SORT_OPTIONS)
    .withMessage(`Sort must be one of [${ALLOWED_SORT_OPTIONS.join(', ')}]`),

  query('page')
    .optional()
    .isString()
    .withMessage('Page must be a string')
    .custom((val) => {
      if (val === undefined || val === '') return true;
      const num = Number(val);
      if (!Number.isInteger(num) || num < 1 || num > 1000) {
        throw new Error('Page must be an integer between 1 and 1000');
      }
      return true;
    }),

  query('limit')
    .optional()
    .isString()
    .withMessage('Limit must be a string')
    .custom((val) => {
      if (val === undefined || val === '') return true;
      const num = Number(val);
      if (!Number.isInteger(num) || num < 1 || num > 50) {
        throw new Error('Limit must be an integer between 1 and 50');
      }
      return true;
    }),

  handleValidationErrors,
];
