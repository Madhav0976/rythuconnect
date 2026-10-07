import { Router } from 'express';
import {
  defaultMarketplaceController,
  MarketplaceController,
} from '../controllers/marketplace.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@rythuconnect/types';
import {
  validateMarketplaceQuery,
  validateMarketplaceListingId,
} from '../validators/marketplace.validators';

export function createMarketplaceRouter(
  controller: MarketplaceController = defaultMarketplaceController
): Router {
  const router = Router();

  // Public/buyer discovery listings search, filter, and pagination
  router.get(
    '/listings',
    validateMarketplaceQuery,
    controller.getListings
  );

  // Single listing detail view for buyer discovery
  router.get(
    '/listings/:id',
    validateMarketplaceListingId,
    controller.getListingById
  );

  // Authorized buyer-only contact endpoint for initiating WhatsApp conversation
  router.get(
    '/listings/:id/contact',
    requireAuth,
    requireRole(UserRole.BUYER),
    validateMarketplaceListingId,
    controller.getListingContact
  );

  return router;
}

export default createMarketplaceRouter();
