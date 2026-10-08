import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import listingRoutes from './listing.routes';
import marketplaceRoutes from './marketplace.routes';
import deliveryRoutes from './delivery.routes';

const router = Router();

// Mount foundational routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/listings', listingRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/delivery', deliveryRoutes);

export default router;
