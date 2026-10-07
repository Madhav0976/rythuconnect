import { Router } from 'express';
import { defaultListingController, ListingController } from '../controllers/listing.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@rythuconnect/types';
import {
  validateCreateListing,
  validateUpdateListing,
  validateUpdateStatus,
  validateListingId,
} from '../validators/listing.validators';

export function createListingRouter(
  controller: ListingController = defaultListingController
): Router {
  const router = Router();

  // All listing management endpoints require authentication
  router.use(requireAuth);

  // Farmer-specific listing endpoints
  router.post(
    '/',
    requireRole(UserRole.FARMER),
    validateCreateListing,
    controller.createListing
  );

  router.get(
    '/my',
    requireRole(UserRole.FARMER),
    controller.getMyListings
  );

  router.get(
    '/my/stats',
    requireRole(UserRole.FARMER),
    controller.getMyStats
  );

  // Listing item operations
  router.get(
    '/:id',
    validateListingId,
    controller.getListingById
  );

  router.patch(
    '/:id',
    requireRole(UserRole.FARMER),
    validateListingId,
    validateUpdateListing,
    controller.updateListing
  );

  router.patch(
    '/:id/status',
    requireRole(UserRole.FARMER),
    validateListingId,
    validateUpdateStatus,
    controller.updateListingStatus
  );

  router.delete(
    '/:id',
    requireRole(UserRole.FARMER),
    validateListingId,
    controller.deleteListing
  );

  return router;
}

export default createListingRouter();
