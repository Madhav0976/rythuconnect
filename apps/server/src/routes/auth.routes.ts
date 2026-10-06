import { Router } from 'express';
import { defaultAuthController, AuthController } from '../controllers/auth.controller';
import { validateSendOtp, validateVerifyOtp } from '../validators/auth.validators';
import { requireAuth } from '../middleware/auth.middleware';
import { createRateLimiter } from '../middleware/rateLimiter';

export function createAuthRouter(controller: AuthController = defaultAuthController): Router {
  const router = Router();

  // Rate limiters for public OTP endpoints (1 minute windows)
  const sendOtpLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many OTP requests from this IP. Please try again after a minute.',
  });

  const verifyOtpLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    max: 20,
    message: 'Too many verification attempts from this IP. Please try again after a minute.',
  });

  // Public Endpoints
  router.post('/send-otp', sendOtpLimiter, validateSendOtp, controller.sendOtp);
  router.post('/verify-otp', verifyOtpLimiter, validateVerifyOtp, controller.verifyOtp);

  // Authenticated Endpoints
  router.get('/me', requireAuth, controller.getMe);
  router.post('/logout', requireAuth, controller.logout);

  return router;
}

export default createAuthRouter();
