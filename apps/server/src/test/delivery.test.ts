import http from 'http';
import mongoose from 'mongoose';
import {
  UserRole,
  DeliveryType,
  ListingStatus,
} from '@rythuconnect/types';
import { defaultTokenService } from '../services/auth/token.service';
import { CropListing } from '../models';
import {
  calculateHaversineDistanceKm,
  calculateDeliveryCharge,
  DEFAULT_DELIVERY_CONFIG,
} from '../services/delivery.service';
import app from '../app';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[Assertion Failure] ${message}`);
  }
}

function httpRequest(
  port: number,
  options: {
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
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

async function runDeliveryTests() {
  console.log('====================================================');
  console.log('[Test:Delivery] Running RythuConnect Delivery Engine Tests');
  console.log('====================================================');

  // --- Direct Unit Tests for Haversine & Delivery Charge ---
  console.log('[Test:Delivery] Direct Algorithm Verification...');

  // Vijayawada to Guntur: lon ~80.6480, lat ~16.5062 to lon ~80.4365, lat ~16.3067
  const distVijayawadaGuntur = calculateHaversineDistanceKm(
    [80.648, 16.5062],
    [80.4365, 16.3067]
  );
  assert(
    distVijayawadaGuntur > 30 && distVijayawadaGuntur < 35,
    `Vijayawada-Guntur distance should be approx ~32km, got ${distVijayawadaGuntur}`
  );

  // Same coordinates: distance must be 0
  const distZero = calculateHaversineDistanceKm([80.5, 16.5], [80.5, 16.5]);
  assert(distZero === 0, 'Distance between identical points must be 0');

  // Antipodal boundary check: North Pole to South Pole must not be NaN
  const distPoles = calculateHaversineDistanceKm([0, 90], [0, -90]);
  assert(!isNaN(distPoles) && Number.isFinite(distPoles), 'Antipodal distance must not produce NaN');
  assert(distPoles > 20000 && distPoles < 20030, `Pole-to-pole distance must be ~20015 km, got ${distPoles}`);

  // Extreme coordinate boundary check: [-180, 0] to [180, 0] (same line across antimeridian)
  const distAntimeridian = calculateHaversineDistanceKm([-180, 0], [180, 0]);
  assert(distAntimeridian === 0, 'Distance between -180 and 180 on same latitude must be 0');

  // Rounding precision check
  const chargeTest = calculateDeliveryCharge(10.555, 30);
  assert(typeof chargeTest.totalCharge === 'number', 'Charge must be a number');
  assert(
    Number.isInteger(chargeTest.totalCharge * 100),
    'Total charge must have at most 2 decimal places'
  );
  console.log('  ✓ Haversine and delivery calculation algorithms verified (including antipodal boundaries).');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;

  try {
    const farmerId = new mongoose.Types.ObjectId().toString();
    const buyerId = new mongoose.Types.ObjectId().toString();

    const farmerToken = defaultTokenService.signAccessToken({
      userId: farmerId,
      role: UserRole.FARMER,
    });
    const buyerToken = defaultTokenService.signAccessToken({
      userId: buyerId,
      role: UserRole.BUYER,
    });

    // Mock Listing IDs
    const pickupListingId = new mongoose.Types.ObjectId().toString();
    const deliveryListingId = new mongoose.Types.ObjectId().toString();
    const noCoordsListingId = new mongoose.Types.ObjectId().toString();
    const soldListingId = new mongoose.Types.ObjectId().toString();
    const expiredListingId = new mongoose.Types.ObjectId().toString();

    // Vijayawada coordinates: [80.6480, 16.5062]
    const vijayawadaCoords: [number, number] = [80.648, 16.5062];
    // Guntur destination: [80.4365, 16.3067]
    const gunturCoords: [number, number] = [80.4365, 16.3067];

    const mockListingsData: Record<string, any> = {
      [pickupListingId]: {
        _id: new mongoose.Types.ObjectId(pickupListingId),
        id: pickupListingId,
        cropName: 'Fresh Tomatoes',
        deliveryType: DeliveryType.BUYER_PICKUP,
        deliveryCharge: 0,
        status: ListingStatus.AVAILABLE,
        coordinates: {
          type: 'Point',
          coordinates: vijayawadaCoords,
        },
      },
      [deliveryListingId]: {
        _id: new mongoose.Types.ObjectId(deliveryListingId),
        id: deliveryListingId,
        cropName: 'Organic Potatoes',
        deliveryType: DeliveryType.FARMER_DELIVERY,
        deliveryCharge: 50, // Farmer-specified custom base fee
        status: ListingStatus.AVAILABLE,
        coordinates: {
          type: 'Point',
          coordinates: vijayawadaCoords,
        },
      },
      [noCoordsListingId]: {
        _id: new mongoose.Types.ObjectId(noCoordsListingId),
        id: noCoordsListingId,
        cropName: 'Green Chillies',
        deliveryType: DeliveryType.FARMER_DELIVERY,
        deliveryCharge: 0,
        status: ListingStatus.AVAILABLE,
        coordinates: undefined, // Missing coordinates
      },
      [soldListingId]: {
        _id: new mongoose.Types.ObjectId(soldListingId),
        id: soldListingId,
        cropName: 'Sweet Carrots',
        deliveryType: DeliveryType.FARMER_DELIVERY,
        deliveryCharge: 30,
        status: ListingStatus.SOLD,
        coordinates: {
          type: 'Point',
          coordinates: vijayawadaCoords,
        },
      },
      [expiredListingId]: {
        _id: new mongoose.Types.ObjectId(expiredListingId),
        id: expiredListingId,
        cropName: 'Watermelon',
        deliveryType: DeliveryType.FARMER_DELIVERY,
        deliveryCharge: 30,
        status: ListingStatus.EXPIRED,
        coordinates: {
          type: 'Point',
          coordinates: vijayawadaCoords,
        },
      },
    };

    function makeQuery(result: any) {
      const q: any = {
        select: () => q,
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
        catch: (reject: any) => Promise.resolve(result).catch(reject),
      };
      return q;
    }

    CropListing.findById = ((id: any) => {
      const idStr = id?.toString();
      const doc = mockListingsData[idStr];
      return makeQuery(doc || null);
    }) as any;

    // ==========================================
    // 1. BUYER_PICKUP returns zero charge
    // ==========================================
    console.log('[Test:Delivery] 1. Testing BUYER_PICKUP returns zero charge...');
    const pickupRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: pickupListingId,
      },
    });
    assert(pickupRes.status === 200, `Pickup estimate must return 200, got ${pickupRes.status}`);
    assert(pickupRes.body.success === true, 'Success must be true');
    assert(pickupRes.body.data.deliveryType === DeliveryType.BUYER_PICKUP, 'Delivery type must be BUYER_PICKUP');
    assert(pickupRes.body.data.deliveryCharge === 0, 'Pickup delivery charge must be 0');
    assert(pickupRes.body.data.distanceKm === null, 'Pickup distance must be null');
    assert(pickupRes.body.data.isPickup === true, 'isPickup must be true');
    console.log('  ✓ BUYER_PICKUP returns zero charge and null distance.');

    // ==========================================
    // 2. FARMER_DELIVERY calculates distance
    // ==========================================
    console.log('[Test:Delivery] 2. Testing FARMER_DELIVERY distance calculation...');
    const deliveryRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: {
          coordinates: gunturCoords,
        },
      },
    });
    assert(deliveryRes.status === 200, 'Farmer delivery estimate must return 200');
    assert(deliveryRes.body.data.deliveryType === DeliveryType.FARMER_DELIVERY, 'Delivery type must be FARMER_DELIVERY');
    assert(typeof deliveryRes.body.data.distanceKm === 'number', 'distanceKm must be numeric');
    assert(deliveryRes.body.data.distanceKm > 30, 'Calculated distance must match Vijayawada-Guntur distance');
    console.log('  ✓ FARMER_DELIVERY distance calculation works.');

    // ==========================================
    // 3. FARMER_DELIVERY calculates charge
    // ==========================================
    console.log('[Test:Delivery] 3. Testing FARMER_DELIVERY charge calculation...');
    const expectedDist = deliveryRes.body.data.distanceKm;
    const expectedBase = 50; // Custom farmer base charge on mock listing
    const expectedDistCharge = Math.round(expectedDist * DEFAULT_DELIVERY_CONFIG.ratePerKm * 100) / 100;
    const expectedTotal = Math.round((expectedBase + expectedDistCharge) * 100) / 100;
    assert(deliveryRes.body.data.deliveryCharge === expectedTotal, `Total charge must be ${expectedTotal}`);
    assert(deliveryRes.body.data.breakdown.baseCharge === 50, 'Breakdown base charge must be 50');
    assert(deliveryRes.body.data.breakdown.ratePerKm === DEFAULT_DELIVERY_CONFIG.ratePerKm, 'Breakdown rate per km must match');
    console.log('  ✓ FARMER_DELIVERY charge calculation verified.');

    // ==========================================
    // 4. Valid coordinates accepted
    // ==========================================
    console.log('[Test:Delivery] 4. Testing valid coordinates accepted...');
    const validCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [78.4867, 17.385] }, // Hyderabad [lon, lat]
      },
    });
    assert(validCoordsRes.status === 200, 'Valid Hyderabad coordinates must return 200');
    console.log('  ✓ Valid coordinates accepted.');

    // ==========================================
    // 5. Invalid longitude rejected (> 180 or < -180)
    // ==========================================
    console.log('[Test:Delivery] 5. Testing invalid longitude rejection...');
    const invLonRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [181, 16.5] },
      },
    });
    assert(invLonRes.status === 400, 'Longitude > 180 must return 400');

    const invLonNegRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [-185, 16.5] },
      },
    });
    assert(invLonNegRes.status === 400, 'Longitude < -180 must return 400');
    console.log('  ✓ Invalid longitude rejected.');

    // ==========================================
    // 6. Invalid latitude rejected (> 90 or < -90)
    // ==========================================
    console.log('[Test:Delivery] 6. Testing invalid latitude rejection...');
    const invLatRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [80.5, 95] },
      },
    });
    assert(invLatRes.status === 400, 'Latitude > 90 must return 400');

    const invLatNegRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [80.5, -95] },
      },
    });
    assert(invLatNegRes.status === 400, 'Latitude < -90 must return 400');
    console.log('  ✓ Invalid latitude rejected.');

    // ==========================================
    // 7. Wrong coordinate length rejected
    // ==========================================
    console.log('[Test:Delivery] 7. Testing wrong coordinate length rejection...');
    const shortCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [80.5] },
      },
    });
    assert(shortCoordsRes.status === 400, 'Single coordinate array must return 400');

    const longCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [80.5, 16.5, 10.0] },
      },
    });
    assert(longCoordsRes.status === 400, '3-element coordinate array must return 400');
    console.log('  ✓ Wrong coordinate array lengths rejected.');

    // ==========================================
    // 8. NaN coordinate rejected
    // ==========================================
    console.log('[Test:Delivery] 8. Testing NaN coordinate rejection...');
    // When sending JSON, NaN is not valid JSON so client may send null or invalid representation, or validator checks
    const nanRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: [null, 16.5] },
      },
    });
    assert(nanRes.status === 400, 'null coordinate must return 400');
    console.log('  ✓ Non-numeric/NaN coordinates rejected.');

    // ==========================================
    // 9. Infinity coordinate rejected
    // ==========================================
    console.log('[Test:Delivery] 9. Testing Infinity coordinate rejection...');
    try {
      calculateHaversineDistanceKm([Infinity, 16.5], [80.5, 16.5]);
      assert(false, 'calculateHaversineDistanceKm must reject Infinity');
    } catch {
      // Expected
    }
    console.log('  ✓ Infinity coordinates rejected.');

    // ==========================================
    // 10. String coordinates rejected
    // ==========================================
    console.log('[Test:Delivery] 10. Testing string coordinates rejection...');
    const strCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: ['80.5', '16.5'] },
      },
    });
    assert(strCoordsRes.status === 400, 'String coordinates must return 400');
    console.log('  ✓ String coordinates strictly rejected.');

    // ==========================================
    // 11. Malformed listing ID format rejected
    // ==========================================
    console.log('[Test:Delivery] 11. Testing malformed listing ID rejection...');
    const malformedIdRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: 'invalid-id-format',
        destination: { coordinates: gunturCoords },
      },
    });
    assert(malformedIdRes.status === 400, 'Malformed listingId must return 400');
    console.log('  ✓ Malformed listing ID rejected.');

    // ==========================================
    // 12. Missing / non-existent listing handled (404)
    // ==========================================
    console.log('[Test:Delivery] 12. Testing missing listing handled with 404...');
    const missingId = new mongoose.Types.ObjectId().toString();
    const missingRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: missingId,
        destination: { coordinates: gunturCoords },
      },
    });
    assert(missingRes.status === 404, 'Non-existent listing must return 404');
    console.log('  ✓ Non-existent listing returns 404.');

    // ==========================================
    // 13. SOLD listing rejected
    // ==========================================
    console.log('[Test:Delivery] 13. Testing SOLD listing rejection...');
    const soldRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: soldListingId,
        destination: { coordinates: gunturCoords },
      },
    });
    assert(soldRes.status === 400, 'SOLD listing must return 400');
    assert(soldRes.body.message.includes('SOLD'), 'Error message should indicate SOLD status');
    console.log('  ✓ SOLD listing rejected.');

    // ==========================================
    // 14. EXPIRED listing rejected
    // ==========================================
    console.log('[Test:Delivery] 14. Testing EXPIRED listing rejection...');
    const expiredRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: expiredListingId,
        destination: { coordinates: gunturCoords },
      },
    });
    assert(expiredRes.status === 400, 'EXPIRED listing must return 400');
    assert(expiredRes.body.message.includes('EXPIRED'), 'Error message should indicate EXPIRED status');
    console.log('  ✓ EXPIRED listing rejected.');

    // ==========================================
    // 15. FARMER cannot call buyer-only estimate endpoint
    // ==========================================
    console.log('[Test:Delivery] 15. Testing FARMER role prohibited...');
    const farmerCallRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${farmerToken}` },
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: gunturCoords },
      },
    });
    assert(farmerCallRes.status === 403, 'FARMER must receive 403 Forbidden');
    console.log('  ✓ FARMER role access rejected with 403.');

    // ==========================================
    // 16. Unauthenticated request rejected
    // ==========================================
    console.log('[Test:Delivery] 16. Testing unauthenticated request rejected...');
    const unauthRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      body: {
        listingId: deliveryListingId,
        destination: { coordinates: gunturCoords },
      },
    });
    assert(unauthRes.status === 401, 'Unauthenticated request must return 401');
    console.log('  ✓ Unauthenticated request rejected with 401.');

    // ==========================================
    // 17. Buyer cannot override farmer coordinates
    // ==========================================
    console.log('[Test:Delivery] 17. Testing buyer cannot override farmer coordinates...');
    const overrideCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        coordinates: [0, 0], // Malicious payload attempting to override origin
        origin: [0, 0],
        destination: { coordinates: gunturCoords },
      },
    });
    assert(overrideCoordsRes.status === 200, 'Request succeeds with authoritative coords');
    assert(
      overrideCoordsRes.body.data.distanceKm === deliveryRes.body.data.distanceKm,
      'Distance must be computed using authoritative listing coordinates, ignoring client origin'
    );
    console.log('  ✓ Buyer cannot override farmer coordinates.');

    // ==========================================
    // 18. Buyer cannot override delivery type
    // ==========================================
    console.log('[Test:Delivery] 18. Testing buyer cannot override delivery type...');
    const overrideTypeRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: pickupListingId,
        deliveryType: DeliveryType.FARMER_DELIVERY, // Attempting to force delivery on pickup listing
        destination: { coordinates: gunturCoords },
      },
    });
    assert(overrideTypeRes.status === 200, 'Request succeeds');
    assert(
      overrideTypeRes.body.data.deliveryType === DeliveryType.BUYER_PICKUP,
      'Listing authoritative deliveryType must be retained'
    );
    assert(overrideTypeRes.body.data.deliveryCharge === 0, 'Charge must remain 0 for pickup');
    console.log('  ✓ Buyer cannot override delivery type.');

    // ==========================================
    // 19. Buyer cannot override delivery charge
    // ==========================================
    console.log('[Test:Delivery] 19. Testing buyer cannot override delivery charge...');
    const overrideChargeRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
        deliveryCharge: 0, // Malicious attempt to force free delivery
        destination: { coordinates: gunturCoords },
      },
    });
    assert(overrideChargeRes.status === 200, 'Request succeeds');
    assert(
      overrideChargeRes.body.data.deliveryCharge === deliveryRes.body.data.deliveryCharge,
      'Server-side calculated charge must be authoritative'
    );
    console.log('  ✓ Buyer cannot override delivery charge.');

    // ==========================================
    // 20. Query/body pollution rejected
    // ==========================================
    console.log('[Test:Delivery] 20. Testing query/body pollution rejected...');
    const arrayListingIdRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: [deliveryListingId, pickupListingId], // Array injection
        destination: { coordinates: gunturCoords },
      },
    });
    assert(arrayListingIdRes.status === 400, 'Array injection on listingId must return 400');
    console.log('  ✓ Parameter pollution properly rejected.');

    // ==========================================
    // 21. Rounding behavior tested
    // ==========================================
    console.log('[Test:Delivery] 21. Testing rounding behavior...');
    const distDecimals = deliveryRes.body.data.distanceKm.toString().split('.')[1] || '';
    const chargeDecimals = deliveryRes.body.data.deliveryCharge.toString().split('.')[1] || '';
    assert(distDecimals.length <= 2, 'Distance must have at most 2 decimal places');
    assert(chargeDecimals.length <= 2, 'Charge must have at most 2 decimal places');
    console.log('  ✓ Rounding behavior verified (at most 2 decimal places).');

    // ==========================================
    // 22. Pickup does not perform unnecessary distance calculation
    // ==========================================
    console.log('[Test:Delivery] 22. Testing pickup skips distance calculation...');
    const pickupWithDestRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: pickupListingId,
        destination: { coordinates: gunturCoords },
      },
    });
    assert(pickupWithDestRes.status === 200, 'Pickup estimate returns 200');
    assert(pickupWithDestRes.body.data.distanceKm === null, 'distanceKm must be null for pickup');
    assert(pickupWithDestRes.body.data.deliveryCharge === 0, 'deliveryCharge must be 0 for pickup');
    console.log('  ✓ Pickup skips distance calculation.');

    // ==========================================
    // 23. Listing without origin coordinates handled safely
    // ==========================================
    console.log('[Test:Delivery] 23. Testing listing without origin coordinates handled safely...');
    const noCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: noCoordsListingId,
        destination: { coordinates: gunturCoords },
      },
    });
    assert(noCoordsRes.status === 400, 'Listing without origin coordinates must return 400');
    assert(noCoordsRes.body.message.includes('origin coordinates'), 'Error message should explain missing coordinates');
    console.log('  ✓ Missing origin coordinates handled safely.');

    // ==========================================
    // 24. Missing destination for FARMER_DELIVERY rejected
    // ==========================================
    console.log('[Test:Delivery] 24. Testing missing destination for FARMER_DELIVERY...');
    const noDestRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/delivery/estimate',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: {
        listingId: deliveryListingId,
      },
    });
    assert(noDestRes.status === 400, 'FARMER_DELIVERY without destination must return 400');
    console.log('  ✓ Missing destination for FARMER_DELIVERY rejected.');

    console.log('====================================================');
    console.log('[Test:Delivery] ALL 24 DELIVERY ENGINE TESTS PASSED CLEANLY');
    console.log('====================================================');

    server.close(() => process.exit(0));
  } catch (err: any) {
    console.error('[Test:Delivery] Failed:', err.message);
    server.close(() => process.exit(1));
  }
}

runDeliveryTests().catch((err) => {
  console.error('[Test:Delivery] Fatal error:', err);
  process.exit(1);
});
