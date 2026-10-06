import http from 'http';
import mongoose from 'mongoose';
import { UserRole, LanguageCode } from '@rythuconnect/types';
import { OtpService, defaultOtpService } from '../services/auth/otp.service';
import { InMemoryOtpStore } from '../services/auth/otp.store';
import { DevOtpProvider, defaultOtpProvider } from '../services/auth/otp.provider';
import { TokenService, defaultTokenService } from '../services/auth/token.service';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { User, FarmerProfile, BuyerProfile } from '../models';
import app from '../app';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failure] ${message}`);
  }
}

// Helper to make in-process HTTP requests
function httpRequest(
  port: number,
  options: {
    method: 'GET' | 'POST';
    path: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = options.body ? JSON.stringify(options.body) : undefined;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path: options.path,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...options.headers,
        },
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : null;
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 500, body: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAuthTests() {
  console.log('====================================================');
  console.log('[Test:Auth] Running RythuConnect Authentication Tests');
  console.log('====================================================');

  // ==========================================
  // SECTION 1: OTP SERVICE UNIT TESTS
  // ==========================================
  console.log('[Test:Auth] 1. Testing OTP Service...');
  const testStore = new InMemoryOtpStore();
  const testProvider = new DevOtpProvider();
  const otpService = new OtpService(testStore, testProvider, 300, 2, 3); // 2s cooldown, 3 max attempts
  const testPhone = '+919876543210';

  // 1.1 Secure Generation & Dispatch
  const sendRes = await otpService.generateAndSendOtp(testPhone);
  assert(sendRes.success === true, 'Initial OTP dispatch should succeed');
  const generatedOtp = testProvider.getTestOtp(testPhone);
  assert(!!generatedOtp, 'Provider should store generated OTP in test cache');
  assert(/^\d{6}$/.test(generatedOtp!), 'Generated OTP must be 6 digits');
  assert(generatedOtp !== '123456', 'Generated OTP must not be static default');

  // 1.2 Resend Cooldown
  const cooldownRes = await otpService.generateAndSendOtp(testPhone);
  assert(cooldownRes.success === false, 'Immediate second OTP request must be rejected by cooldown');
  assert(
    (cooldownRes.cooldownRemainingSeconds || 0) > 0,
    'Cooldown remaining seconds must be reported'
  );

  // 1.3 Invalid OTP Attempt
  const invalidRes = await otpService.verifyOtp(testPhone, '000000');
  assert(invalidRes.success === false, 'Invalid OTP must fail verification');
  assert(invalidRes.remainingAttempts === 2, 'Remaining attempts must decrement to 2');

  // 1.4 Max Attempts Lockout
  await otpService.verifyOtp(testPhone, '000001');
  const lockoutRes = await otpService.verifyOtp(testPhone, '000002');
  assert(lockoutRes.success === false, 'Exceeding max attempts must fail');
  assert(lockoutRes.remainingAttempts === 0, 'Remaining attempts must be 0 after lockout');

  // Stored OTP should be wiped on lockout
  const postLockoutRes = await otpService.verifyOtp(testPhone, generatedOtp!);
  assert(
    postLockoutRes.success === false,
    'Locked out OTP must be deleted and not usable even with correct code'
  );

  // 1.5 Valid OTP & Single-Use Verification
  await new Promise((r) => setTimeout(r, 2100)); // wait past 2s cooldown
  await otpService.generateAndSendOtp(testPhone);
  const newOtp = testProvider.getTestOtp(testPhone);
  assert(!!newOtp, 'New OTP generated after cooldown');

  const validVerifyRes = await otpService.verifyOtp(testPhone, newOtp!);
  assert(validVerifyRes.success === true, 'Correct OTP must verify successfully');

  // Single use: Re-verification must fail
  const replayRes = await otpService.verifyOtp(testPhone, newOtp!);
  assert(replayRes.success === false, 'Replaying consumed OTP must fail (single-use guarantee)');

  // 1.6 Expired OTP
  await testStore.set({
    phone: testPhone,
    otp: '999999',
    createdAt: Date.now() - 400000,
    expiresAt: Date.now() - 1000, // expired
    attempts: 0,
  });
  const expiredRes = await otpService.verifyOtp(testPhone, '999999');
  assert(expiredRes.success === false, 'Expired OTP must fail verification');
  console.log('  ✓ OTP service tests passed.');

  // ==========================================
  // SECTION 2: JWT TOKEN SERVICE UNIT TESTS
  // ==========================================
  console.log('[Test:Auth] 2. Testing JWT Token Service...');
  const testSecret = 'test_jwt_secret_key_antigravity_12345';
  const tokenService = new TokenService(testSecret, '2h');

  // 2.1 Token Generation & Verification
  const payload = { userId: 'usr_farmer_001', role: UserRole.FARMER };
  const token = tokenService.signAccessToken(payload);
  assert(typeof token === 'string' && token.split('.').length === 3, 'JWT must be valid compact string');

  const decoded = tokenService.verifyAccessToken(token);
  assert(decoded.userId === payload.userId, 'Decoded userId must match');
  assert(decoded.role === payload.role, 'Decoded role must match');

  // 2.2 Invalid Token
  let invalidTokenError = false;
  try {
    tokenService.verifyAccessToken('invalid.token.signature');
  } catch (err: any) {
    invalidTokenError = err.code === 'TOKEN_INVALID';
  }
  assert(invalidTokenError, 'Corrupted token must throw TOKEN_INVALID');

  // 2.3 Expired Token
  const shortLivedService = new TokenService(testSecret, '1ms');
  const shortLivedToken = shortLivedService.signAccessToken(payload);
  await new Promise((r) => setTimeout(r, 20));
  let expiredTokenError = false;
  try {
    shortLivedService.verifyAccessToken(shortLivedToken);
  } catch (err: any) {
    expiredTokenError = err.code === 'TOKEN_EXPIRED';
  }
  assert(expiredTokenError, 'Expired token must throw TOKEN_EXPIRED');
  console.log('  ✓ JWT token service tests passed.');

  // ==========================================
  // SECTION 3: AUTH & ROLE MIDDLEWARE TESTS
  // ==========================================
  console.log('[Test:Auth] 3. Testing Middleware...');
  const mockRes = () => {
    const res: any = {};
    res.statusCode = 200;
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.body = data;
      return res;
    };
    return res;
  };

  // 3.1 requireAuth - Missing header
  const reqNoHeader: any = { headers: {} };
  const resNoHeader = mockRes();
  let nextCalled = false;
  requireAuth(reqNoHeader, resNoHeader, () => {
    nextCalled = true;
  });
  assert(resNoHeader.statusCode === 401, 'Missing auth header must yield 401');
  assert(!nextCalled, 'next() must not be called when auth fails');

  // 3.2 requireAuth - Malformed header
  const reqMalformed: any = { headers: { authorization: 'Basic 12345' } };
  const resMalformed = mockRes();
  requireAuth(reqMalformed, resMalformed, () => {});
  assert(resMalformed.statusCode === 401, 'Non-Bearer header must yield 401');

  // 3.3 requireRole - Unauthenticated
  const reqUnauth: any = {};
  const resUnauth = mockRes();
  const farmerRoleMiddleware = requireRole(UserRole.FARMER);
  farmerRoleMiddleware(reqUnauth, resUnauth, () => {});
  assert(resUnauth.statusCode === 401, 'requireRole without req.user must yield 401');

  // 3.4 requireRole - Insufficient Role
  const reqBuyer: any = { user: { userId: 'u1', role: UserRole.BUYER } };
  const resBuyer = mockRes();
  farmerRoleMiddleware(reqBuyer, resBuyer, () => {});
  assert(resBuyer.statusCode === 403, 'Buyer accessing Farmer-only role must yield 403');

  // 3.5 requireRole - Allowed Role
  const reqFarmer: any = { user: { userId: 'u1', role: UserRole.FARMER } };
  const resFarmer = mockRes();
  let farmerAllowed = false;
  farmerRoleMiddleware(reqFarmer, resFarmer, () => {
    farmerAllowed = true;
  });
  assert(farmerAllowed, 'Matching role must call next()');
  console.log('  ✓ Middleware tests passed.');

  // ==========================================
  // SECTION 4: HTTP ENDPOINT INTEGRATION TESTS
  // ==========================================
  console.log('[Test:Auth] 4. Testing HTTP API Endpoints...');
  const server = app.listen(0);
  const port = (server.address() as any).port;

  try {
    // 4.1 POST /api/auth/send-otp - Validation Error (invalid phone)
    const invalidPhoneRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/auth/send-otp',
      body: { phone: '123' },
    });
    assert(invalidPhoneRes.status === 400, 'Invalid phone number must return 400 Bad Request');
    assert(invalidPhoneRes.body.success === false, 'Success must be false on invalid phone');

    // 4.2 POST /api/auth/send-otp - Success
    const validSendRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/auth/send-otp',
      body: { phone: '9876543210' },
    });
    assert(validSendRes.status === 200, 'Valid send-otp request must return 200 OK');
    assert(validSendRes.body.data.phone === '+919876543210', 'Phone number must be normalized in response');
    assert(!validSendRes.body.data.otp, 'OTP must NEVER be returned in production/API response');

    // 4.3 POST /api/auth/send-otp - Immediate Re-request (Rate limit / Cooldown)
    const cooldownHttpRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/auth/send-otp',
      body: { phone: '9876543210' },
    });
    assert(cooldownHttpRes.status === 429, 'Immediate re-request must return 429 Too Many Requests');

    // 4.4 POST /api/auth/verify-otp - Validation Error (Admin Self-Registration Block)
    const adminSelfRegRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/auth/verify-otp',
      body: {
        phone: '9876543210',
        otp: '123456',
        role: UserRole.ADMIN, // FORBIDDEN: Admin role self-assignment
      },
    });
    assert(adminSelfRegRes.status === 400, 'Attempting to register as ADMIN must return 400 Bad Request');
    assert(
      JSON.stringify(adminSelfRegRes.body).includes('Admin role cannot be self-assigned'),
      'Admin role rejection reason must be clear'
    );

    // 4.5 POST /api/auth/verify-otp - Invalid OTP format
    const malformedOtpRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/auth/verify-otp',
      body: { phone: '9876543210', otp: 'abc' },
    });
    assert(malformedOtpRes.status === 400, 'Non-6-digit OTP must return 400 Bad Request');

    // 4.6 GET /api/auth/me - Unauthenticated
    const unauthMeRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/auth/me',
    });
    assert(unauthMeRes.status === 401, 'GET /api/auth/me without token must return 401 Unauthorized');

    // 4.7 GET /api/auth/me - Authenticated via valid JWT
    const validAuthToken = defaultTokenService.signAccessToken({
      userId: 'mock-user-id-999',
      role: UserRole.FARMER,
    });
    const authMeRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/auth/me',
      headers: {
        Authorization: `Bearer ${validAuthToken}`,
      },
    });
    assert(authMeRes.status === 200, 'GET /api/auth/me with valid token must return 200 OK');
    assert(authMeRes.body.data.user.role === UserRole.FARMER, 'User role in /me must match token');

    // 4.8 POST /api/auth/logout - Authenticated
    const logoutRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/auth/logout',
      headers: {
        Authorization: `Bearer ${validAuthToken}`,
      },
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout with valid token must return 200 OK');

    // 4.9 POST /api/auth/logout - Unauthenticated
    const unauthLogoutRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/auth/logout',
    });
    assert(unauthLogoutRes.status === 401, 'POST /api/auth/logout without token must return 401');

    console.log('  ✓ HTTP API endpoint tests passed.');

    // ==========================================
    // SECTION 5: ROLE IMMUTABILITY & PROFILE INTEGRITY TESTS
    // ==========================================
    console.log('[Test:Auth] 5. Testing Role Immutability & Profile Integrity...');

    // Stubs and state restoration
    const origReadyState = mongoose.connection.readyState;
    const origUserFindOne = User.findOne;
    const origUserCreate = User.create;
    const origFarmerFindOne = FarmerProfile.findOne;
    const origFarmerCreate = FarmerProfile.create;
    const origBuyerFindOne = BuyerProfile.findOne;
    const origBuyerCreate = BuyerProfile.create;

    try {
      // Simulate connected database for verify-otp integration tests
      Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });

      // 5.1 Existing FARMER + requested BUYER -> REJECTED (Role Immutability)
      const phoneFarmer = '+919111111111';
      await defaultOtpService.generateAndSendOtp(phoneFarmer);
      const otpFarmer = defaultOtpProvider.getTestOtp(phoneFarmer)!;

      const mockFarmerDoc: any = {
        id: 'mock_farmer_id_101',
        _id: new mongoose.Types.ObjectId(),
        phone: phoneFarmer,
        role: UserRole.FARMER,
        preferredLanguage: LanguageCode.EN,
        isVerified: true,
        save: async () => mockFarmerDoc,
      };

      User.findOne = ((filter: any) => {
        if (filter.phone === phoneFarmer) return Promise.resolve(mockFarmerDoc);
        return Promise.resolve(null);
      }) as any;

      const farmerMutateToBuyerRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9111111111',
          otp: otpFarmer,
          role: UserRole.BUYER,
        },
      });
      assert(farmerMutateToBuyerRes.status === 400, 'Existing FARMER submitting BUYER must return 400 Bad Request');
      assert(
        farmerMutateToBuyerRes.body.message.includes('Role mismatch') &&
          farmerMutateToBuyerRes.body.message.includes('FARMER'),
        'Rejection message must indicate role mismatch with existing FARMER role'
      );

      // 5.2 Existing BUYER + requested FARMER -> REJECTED (Role Immutability)
      const phoneBuyer = '+919222222222';
      await defaultOtpService.generateAndSendOtp(phoneBuyer);
      const otpBuyer = defaultOtpProvider.getTestOtp(phoneBuyer)!;

      const mockBuyerDoc: any = {
        id: 'mock_buyer_id_202',
        _id: new mongoose.Types.ObjectId(),
        phone: phoneBuyer,
        role: UserRole.BUYER,
        preferredLanguage: LanguageCode.EN,
        isVerified: true,
        save: async () => mockBuyerDoc,
      };

      User.findOne = ((filter: any) => {
        if (filter.phone === phoneBuyer) return Promise.resolve(mockBuyerDoc);
        return Promise.resolve(null);
      }) as any;

      const buyerMutateToFarmerRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9222222222',
          otp: otpBuyer,
          role: UserRole.FARMER,
        },
      });
      assert(buyerMutateToFarmerRes.status === 400, 'Existing BUYER submitting FARMER must return 400 Bad Request');
      assert(
        buyerMutateToFarmerRes.body.message.includes('Role mismatch') &&
          buyerMutateToFarmerRes.body.message.includes('BUYER'),
        'Rejection message must indicate role mismatch with existing BUYER role'
      );

      // 5.3 Existing ADMIN + requested FARMER -> REJECTED (Role Immutability)
      const phoneAdmin = '+919333333333';
      await defaultOtpService.generateAndSendOtp(phoneAdmin);
      const otpAdmin = defaultOtpProvider.getTestOtp(phoneAdmin)!;

      const mockAdminDoc: any = {
        id: 'mock_admin_id_303',
        _id: new mongoose.Types.ObjectId(),
        phone: phoneAdmin,
        role: UserRole.ADMIN,
        preferredLanguage: LanguageCode.EN,
        isVerified: true,
        save: async () => mockAdminDoc,
      };

      User.findOne = ((filter: any) => {
        if (filter.phone === phoneAdmin) return Promise.resolve(mockAdminDoc);
        return Promise.resolve(null);
      }) as any;

      const adminMutateToFarmerRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9333333333',
          otp: otpAdmin,
          role: UserRole.FARMER,
        },
      });
      assert(adminMutateToFarmerRes.status === 400, 'Existing ADMIN submitting FARMER must return 400 Bad Request');
      assert(
        adminMutateToFarmerRes.body.message.includes('Role mismatch') &&
          adminMutateToFarmerRes.body.message.includes('ADMIN'),
        'Rejection message must indicate role mismatch with existing ADMIN role'
      );

      // 5.4 Existing User + requested ADMIN -> REJECTED (Admin Privilege Protection)
      const phoneExistingUser = '+919444444444';
      await defaultOtpService.generateAndSendOtp(phoneExistingUser);
      const otpExistingUser = defaultOtpProvider.getTestOtp(phoneExistingUser)!;

      const existingUserToAdminRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9444444444',
          otp: otpExistingUser,
          role: UserRole.ADMIN,
        },
      });
      assert(existingUserToAdminRes.status === 400, 'User requesting ADMIN role must return 400 Bad Request');
      assert(
        JSON.stringify(existingUserToAdminRes.body).includes('Admin role cannot be self-assigned'),
        'Response must forbid admin self-assignment'
      );

      // 5.5 Auto-Registration Profile Creation for new FARMER
      const phoneNewFarmer = '+919555555555';
      await defaultOtpService.generateAndSendOtp(phoneNewFarmer);
      const otpNewFarmer = defaultOtpProvider.getTestOtp(phoneNewFarmer)!;

      let createdFarmerUser: any = null;
      let createdFarmerProfile: any = null;

      User.findOne = (() => Promise.resolve(null)) as any;
      User.create = ((doc: any) => {
        createdFarmerUser = {
          ...doc,
          id: 'new_farmer_uid',
          _id: new mongoose.Types.ObjectId(),
        };
        return Promise.resolve(createdFarmerUser);
      }) as any;

      FarmerProfile.findOne = (() => Promise.resolve(null)) as any;
      FarmerProfile.create = ((doc: any) => {
        createdFarmerProfile = { ...doc, id: 'fp_1' };
        return Promise.resolve(createdFarmerProfile);
      }) as any;

      const newFarmerRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9555555555',
          otp: otpNewFarmer,
          role: UserRole.FARMER,
          farmLocation: 'Guntur Andhra Pradesh',
        },
      });
      assert(newFarmerRes.status === 200, 'New FARMER registration must succeed with 200 OK');
      assert(createdFarmerUser !== null && createdFarmerUser.role === UserRole.FARMER, 'User must be created as FARMER');
      assert(createdFarmerProfile !== null, 'FarmerProfile must be automatically created');
      assert(
        createdFarmerProfile.userId.toString() === createdFarmerUser._id.toString(),
        'FarmerProfile must reference the newly created user._id'
      );
      assert(
        createdFarmerProfile.farmLocation === 'Guntur Andhra Pradesh',
        'FarmerProfile must retain the provided farmLocation'
      );

      // 5.6 Auto-Registration Profile Creation for new BUYER
      const phoneNewBuyer = '+919666666666';
      await defaultOtpService.generateAndSendOtp(phoneNewBuyer);
      const otpNewBuyer = defaultOtpProvider.getTestOtp(phoneNewBuyer)!;

      let createdBuyerUser: any = null;
      let createdBuyerProfile: any = null;

      User.findOne = (() => Promise.resolve(null)) as any;
      User.create = ((doc: any) => {
        createdBuyerUser = {
          ...doc,
          id: 'new_buyer_uid',
          _id: new mongoose.Types.ObjectId(),
        };
        return Promise.resolve(createdBuyerUser);
      }) as any;

      BuyerProfile.findOne = (() => Promise.resolve(null)) as any;
      BuyerProfile.create = ((doc: any) => {
        createdBuyerProfile = { ...doc, id: 'bp_1' };
        return Promise.resolve(createdBuyerProfile);
      }) as any;

      const newBuyerRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9666666666',
          otp: otpNewBuyer,
          role: UserRole.BUYER,
          deliveryAddress: 'Main Road Market Vijayawada',
          businessName: 'Krishna Agro Traders',
        },
      });
      assert(newBuyerRes.status === 200, 'New BUYER registration must succeed with 200 OK');
      assert(createdBuyerUser !== null && createdBuyerUser.role === UserRole.BUYER, 'User must be created as BUYER');
      assert(createdBuyerProfile !== null, 'BuyerProfile must be automatically created');
      assert(
        createdBuyerProfile.userId.toString() === createdBuyerUser._id.toString(),
        'BuyerProfile must reference the newly created user._id'
      );
      assert(
        createdBuyerProfile.deliveryAddress === 'Main Road Market Vijayawada',
        'BuyerProfile must retain the provided deliveryAddress'
      );
      assert(
        createdBuyerProfile.businessName === 'Krishna Agro Traders',
        'BuyerProfile must retain the provided businessName'
      );

      // 5.7 Existing Profile Reuse (No Duplicate Profile Created)
      const phoneExistingFarmer = '+919777777777';
      await defaultOtpService.generateAndSendOtp(phoneExistingFarmer);
      const otpExistingFarmer = defaultOtpProvider.getTestOtp(phoneExistingFarmer)!;

      let duplicateFarmerProfileCreated = false;
      const existingFarmerDoc: any = {
        id: 'exist_farmer_uid',
        _id: new mongoose.Types.ObjectId(),
        phone: phoneExistingFarmer,
        role: UserRole.FARMER,
        preferredLanguage: LanguageCode.EN,
        isVerified: true,
        save: async () => existingFarmerDoc,
      };

      User.findOne = (() => Promise.resolve(existingFarmerDoc)) as any;
      FarmerProfile.findOne = (() => Promise.resolve({ id: 'existing_fp', userId: existingFarmerDoc._id })) as any;
      FarmerProfile.create = (() => {
        duplicateFarmerProfileCreated = true;
        return Promise.resolve({});
      }) as any;

      const existingFarmerLoginRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9777777777',
          otp: otpExistingFarmer,
          role: UserRole.FARMER,
        },
      });
      assert(existingFarmerLoginRes.status === 200, 'Existing FARMER login must return 200 OK');
      assert(duplicateFarmerProfileCreated === false, 'Existing FarmerProfile must be reused without duplicate creation');

      // 5.8 Admin Profile Guard (No Accidental Farmer/Buyer Profile Creation)
      const phoneAdminLogin = '+919888888888';
      await defaultOtpService.generateAndSendOtp(phoneAdminLogin);
      const otpAdminLogin = defaultOtpProvider.getTestOtp(phoneAdminLogin)!;

      let adminFarmerProfileCreated = false;
      let adminBuyerProfileCreated = false;

      const adminUserDoc: any = {
        id: 'admin_uid',
        _id: new mongoose.Types.ObjectId(),
        phone: phoneAdminLogin,
        role: UserRole.ADMIN,
        preferredLanguage: LanguageCode.EN,
        isVerified: true,
        save: async () => adminUserDoc,
      };

      User.findOne = (() => Promise.resolve(adminUserDoc)) as any;
      FarmerProfile.create = (() => {
        adminFarmerProfileCreated = true;
        return Promise.resolve({});
      }) as any;
      BuyerProfile.create = (() => {
        adminBuyerProfileCreated = true;
        return Promise.resolve({});
      }) as any;

      const adminLoginRes = await httpRequest(port, {
        method: 'POST',
        path: '/api/auth/verify-otp',
        body: {
          phone: '9888888888',
          otp: otpAdminLogin,
        },
      });
      assert(adminLoginRes.status === 200, 'Existing ADMIN login without role override must return 200 OK');
      assert(adminFarmerProfileCreated === false, 'ADMIN user must never trigger FarmerProfile creation');
      assert(adminBuyerProfileCreated === false, 'ADMIN user must never trigger BuyerProfile creation');

      console.log('  ✓ Role immutability and profile integrity tests passed.');
    } finally {
      // Restore stubs
      Object.defineProperty(mongoose.connection, 'readyState', { value: origReadyState, configurable: true });
      User.findOne = origUserFindOne;
      User.create = origUserCreate;
      FarmerProfile.findOne = origFarmerFindOne;
      FarmerProfile.create = origFarmerCreate;
      BuyerProfile.findOne = origBuyerFindOne;
      BuyerProfile.create = origBuyerCreate;
    }
  } finally {
    server.close();
  }

  console.log('====================================================');
  console.log('[Test:Auth] ALL AUTHENTICATION TESTS PASSED CLEANLY');
  console.log('====================================================');
}

runAuthTests().catch((err) => {
  console.error('[Test:Auth] Failure:', err);
  process.exit(1);
});
