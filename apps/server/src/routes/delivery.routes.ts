import { Router } from 'express';
import { UserRole } from '@rythuconnect/types';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validateDeliveryEstimate } from '../validators/delivery.validators';
import {
  DeliveryController,
  defaultDeliveryController,
} from '../controllers/delivery.controller';

export function createDeliveryRouter(
  controller: DeliveryController = defaultDeliveryController
): Router {
  const router = Router();

  /**
   * POST /api/delivery/estimate
   * Estimates delivery distance and charge for a crop listing.
   * Restricted strictly to authenticated BUYER users.
   */
  router.post(
    '/estimate',
    requireAuth,
    requireRole(UserRole.BUYER),
    validateDeliveryEstimate,
    controller.estimateDelivery
  );

  return router;
}
export default createDeliveryRouter();
