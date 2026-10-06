import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';

const router = Router();

// Mount foundational routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);

export default router;
