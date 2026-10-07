import http from 'http';
import mongoose from 'mongoose';
import {
  UserRole,
  DeliveryType,
  ListingStatus,
  QuantityUnit,
  CreateListingRequest,
} from '@rythuconnect/types';
import { defaultTokenService } from '../services/auth/token.service';
import { CropListing, Category } from '../models';
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

async function runListingTests() {
  console.log('====================================================');
  console.log('[Test:Listings] Running RythuConnect Crop Listing Tests');
  console.log('====================================================');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const port = (server.address() as any).port;

  try {
    const farmer1Id = new mongoose.Types.ObjectId().toString();
    const farmer2Id = new mongoose.Types.ObjectId().toString();
    const buyerId = new mongoose.Types.ObjectId().toString();

    const farmer1Token = defaultTokenService.signAccessToken({
      userId: farmer1Id,
      role: UserRole.FARMER,
    });
    const farmer2Token = defaultTokenService.signAccessToken({
      userId: farmer2Id,
      role: UserRole.FARMER,
    });
    const buyerToken = defaultTokenService.signAccessToken({
      userId: buyerId,
      role: UserRole.BUYER,
    });

    const mockCategoryId = new mongoose.Types.ObjectId().toString();

    // In-memory mock store for listings
    const inMemoryListings: Map<string, any> = new Map();

    // Mock Category validation & lookup
    Category.findById = ((id: any) => {
      if (id.toString() === mockCategoryId) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(mockCategoryId),
          id: mockCategoryId,
          name: 'Vegetables',
          slug: 'vegetables',
          isActive: true,
          toJSON: () => ({ id: mockCategoryId, name: 'Vegetables', slug: 'vegetables', isActive: true }),
        });
      }
      return Promise.resolve(null);
    }) as any;

    Category.countDocuments = (() => Promise.resolve(1)) as any;
    Category.find = (() => ({
      sort: () =>
        Promise.resolve([
          {
            _id: new mongoose.Types.ObjectId(mockCategoryId),
            id: mockCategoryId,
            name: 'Vegetables',
            slug: 'vegetables',
            isActive: true,
            toJSON: () => ({ id: mockCategoryId, name: 'Vegetables', slug: 'vegetables', isActive: true }),
          },
        ]),
    })) as any;

    // Helper to build mock listing document with methods
    function createMockDoc(data: any) {
      const doc: any = {
        ...data,
        _id: data._id || new mongoose.Types.ObjectId(data.id),
        id: data.id || data._id?.toString(),
        farmerId: data.farmerId instanceof mongoose.Types.ObjectId ? data.farmerId : new mongoose.Types.ObjectId(data.farmerId),
        categoryId: data.categoryId,
        status: data.status || ListingStatus.AVAILABLE,
        save: async function () {
          inMemoryListings.set(this.id, this);
          return this;
        },
        populate: async function () {
          return this;
        },
        populated: function () {
          return false;
        },
        toJSON: function () {
          return {
            id: this.id,
            farmerId: this.farmerId.toString(),
            categoryId: typeof this.categoryId === 'object' ? this.categoryId.id : this.categoryId.toString(),
            cropName: this.cropName,
            quantity: this.quantity,
            quantityUnit: this.quantityUnit,
            price: this.price,
            harvestDate: this.harvestDate,
            deliveryType: this.deliveryType,
            deliveryCharge: this.deliveryCharge,
            location: this.location,
            coordinates: this.coordinates,
            images: this.images,
            status: this.status,
            createdAt: this.createdAt || new Date(),
            updatedAt: this.updatedAt || new Date(),
          };
        },
      };
      return doc;
    }

    // Mock CropListing methods
    CropListing.prototype.save = async function () {
      const id = this._id ? this._id.toString() : new mongoose.Types.ObjectId().toString();
      this.id = id;
      const doc = createMockDoc(this);
      inMemoryListings.set(id, doc);
      return doc;
    };
    CropListing.prototype.populate = async function () {
      return this;
    };
    CropListing.prototype.populated = function () {
      return false;
    };

    CropListing.findById = ((id: any) => {
      const idStr = id.toString();
      const found = inMemoryListings.get(idStr);
      if (!found) {
        return {
          populate: () => Promise.resolve(null),
        };
      }
      return {
        populate: () => Promise.resolve(found),
        then: (resolve: any) => resolve(found),
      };
    }) as any;

    CropListing.find = ((query: any) => {
      const results: any[] = [];
      const targetFarmer = query.farmerId?.toString();
      const targetStatus = query.status;

      for (const item of inMemoryListings.values()) {
        const matchesFarmer = !targetFarmer || item.farmerId.toString() === targetFarmer;
        const matchesStatus = !targetStatus || item.status === targetStatus;
        if (matchesFarmer && matchesStatus) {
          results.push(item);
        }
      }

      return {
        sort: () => ({
          populate: () => Promise.resolve(results),
        }),
      };
    }) as any;

    CropListing.countDocuments = ((query: any) => {
      let count = 0;
      const targetFarmer = query.farmerId?.toString();
      const targetStatus = query.status;

      for (const item of inMemoryListings.values()) {
        const matchesFarmer = !targetFarmer || item.farmerId.toString() === targetFarmer;
        const matchesStatus = !targetStatus || item.status === targetStatus;
        if (matchesFarmer && matchesStatus) {
          count++;
        }
      }
      return Promise.resolve(count);
    }) as any;

    CropListing.findByIdAndDelete = ((id: any) => {
      const idStr = id.toString();
      inMemoryListings.delete(idStr);
      return Promise.resolve({ id: idStr });
    }) as any;

    // ==========================================
    // 1. GET /api/categories
    // ==========================================
    console.log('[Test:Listings] 1. Testing GET /api/categories...');
    const catRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/categories',
    });
    assert(catRes.status === 200, 'Categories endpoint must return 200');
    assert(Array.isArray(catRes.body.data), 'Categories data must be an array');
    console.log('  ✓ Categories endpoint passed.');

    // ==========================================
    // 2. POST /api/listings Authentication & RBAC
    // ==========================================
    console.log('[Test:Listings] 2. Testing Authorization on creation...');

    const validPayload: CreateListingRequest = {
      cropName: 'Organic Tomatoes',
      categoryId: mockCategoryId,
      quantity: 500,
      quantityUnit: QuantityUnit.KG,
      price: 35,
      harvestDate: new Date().toISOString(),
      deliveryType: DeliveryType.BUYER_PICKUP,
      deliveryCharge: 0,
      location: 'Madanapalle, Chittoor District',
      coordinates: {
        type: 'Point',
        coordinates: [78.5042, 13.556],
      },
      images: ['https://images.unsplash.com/photo-1592924357228-91a4daadcfea'],
    };

    // 2.1 Unauthenticated creation rejected
    const unauthRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      body: validPayload,
    });
    assert(unauthRes.status === 401, 'Unauthenticated create must return 401');

    // 2.2 BUYER role rejected from farmer endpoints
    const buyerCreateRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${buyerToken}` },
      body: validPayload,
    });
    assert(buyerCreateRes.status === 403, 'BUYER role cannot create crop listings (must return 403)');

    const buyerGetMyRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/listings/my',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert(buyerGetMyRes.status === 403, 'BUYER role cannot access /my listings (must return 403)');

    const buyerStatsRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/listings/my/stats',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert(buyerStatsRes.status === 403, 'BUYER role cannot access /my/stats (must return 403)');
    console.log('  ✓ Authorization checks passed.');

    // ==========================================
    // 3. Validation Rules
    // ==========================================
    console.log('[Test:Listings] 3. Testing Validation rules...');

    // 3.1 Negative price rejected
    const negPriceRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, price: -50 },
    });
    assert(negPriceRes.status === 400, 'Negative price must be rejected with 400');

    // 3.1b Zero price rejected (must be strictly positive)
    const zeroPriceRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, price: 0 },
    });
    assert(zeroPriceRes.status === 400, 'Zero price must be rejected with 400 (price must be positive)');

    // 3.2 Non-positive quantity rejected
    const zeroQtyRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, quantity: 0 },
    });
    assert(zeroQtyRes.status === 400, 'Zero quantity must be rejected with 400');

    // 3.3 Invalid quantity unit rejected
    const badUnitRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, quantityUnit: 'LITERS' },
    });
    assert(badUnitRes.status === 400, 'Invalid unit must be rejected with 400');

    // 3.4 Invalid coordinates rejected
    const badCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, coordinates: { type: 'Point', coordinates: [999, 999] } },
    });
    assert(badCoordsRes.status === 400, 'Out-of-range coordinates must be rejected with 400');

    // 3.4b Coordinates with >2 dimensions rejected
    const tripleCoordsRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, coordinates: { type: 'Point', coordinates: [78.5, 13.5, 100] } },
    });
    assert(tripleCoordsRes.status === 400, 'Coordinates with >2 dimensions must be rejected with 400');

    // 3.5 Invalid image URL rejected
    const badUrlRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, images: ['javascript:alert(1)'] },
    });
    assert(badUrlRes.status === 400, 'Invalid image URL must be rejected with 400');

    console.log('  ✓ Server-side validation rules passed.');

    // ==========================================
    // 4. Valid Creation by Farmer
    // ==========================================
    console.log('[Test:Listings] 4. Testing successful creation...');
    const createRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: validPayload,
    });
    assert(createRes.status === 201, 'Valid creation must return 201 Created');
    assert(createRes.body.success === true, 'Response must indicate success');
    assert(createRes.body.data.farmerId === farmer1Id, 'farmerId must be assigned from authenticated user');
    assert(createRes.body.data.status === ListingStatus.AVAILABLE, 'New listing must be initialized as AVAILABLE');
    const createdListingId = createRes.body.data.id;
    assert(!!createdListingId, 'Created listing must have an ID');
    console.log('  ✓ Farmer listing created successfully.');

    // ==========================================
    // 5. Read Farmer's Listings & Stats
    // ==========================================
    console.log('[Test:Listings] 5. Testing listing retrieval and stats...');
    const myListingsRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/listings/my',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    assert(myListingsRes.status === 200, 'GET /api/listings/my must return 200');
    assert(Array.isArray(myListingsRes.body.data), 'data must be an array');
    assert(myListingsRes.body.data.length >= 1, 'Farmer 1 must have at least 1 listing');

    const statsRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/listings/my/stats',
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    assert(statsRes.status === 200, 'GET /api/listings/my/stats must return 200');
    assert(statsRes.body.data.totalListings >= 1, 'Total listings must be >= 1');
    assert(statsRes.body.data.activeListings >= 1, 'Active listings must be >= 1');
    assert(statsRes.body.data.soldListings === 0, 'Sold listings must be 0 initially');
    console.log('  ✓ My listings and dashboard stats passed.');

    // ==========================================
    // 6. IDOR Protection (Cross-Farmer Mutation)
    // ==========================================
    console.log('[Test:Listings] 6. Testing IDOR / Ownership enforcement...');

    // Farmer 2 attempts to edit Farmer 1's listing
    const idorPatchRes = await httpRequest(port, {
      method: 'PATCH',
      path: `/api/listings/${createdListingId}`,
      headers: { Authorization: `Bearer ${farmer2Token}` },
      body: { price: 999 },
    });
    assert(idorPatchRes.status === 403, 'Cross-farmer update attempt must return 403 Forbidden');

    // Farmer 2 attempts to mark Farmer 1's listing as SOLD
    const idorStatusRes = await httpRequest(port, {
      method: 'PATCH',
      path: `/api/listings/${createdListingId}/status`,
      headers: { Authorization: `Bearer ${farmer2Token}` },
      body: { status: ListingStatus.SOLD },
    });
    assert(idorStatusRes.status === 403, 'Cross-farmer status mutation must return 403 Forbidden');

    // Farmer 2 attempts to delete Farmer 1's listing
    const idorDeleteRes = await httpRequest(port, {
      method: 'DELETE',
      path: `/api/listings/${createdListingId}`,
      headers: { Authorization: `Bearer ${farmer2Token}` },
    });
    assert(idorDeleteRes.status === 403, 'Cross-farmer deletion must return 403 Forbidden');
    console.log('  ✓ IDOR protection verified across update, status, and delete.');

    // ==========================================
    // 7. Owner Update & Mass Assignment Protection
    // ==========================================
    console.log('[Test:Listings] 7. Testing owner update and mass assignment protection...');
    const ownerPatchRes = await httpRequest(port, {
      method: 'PATCH',
      path: `/api/listings/${createdListingId}`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: {
        price: 42,
        quantity: 600,
        farmerId: farmer2Id, // Malicious re-assignment attempt
        status: ListingStatus.SOLD, // Status machine bypass attempt
        _id: 'fake-id',
        createdAt: '2020-01-01',
      },
    });
    assert(ownerPatchRes.status === 200, 'Owner patch must return 200');
    assert(ownerPatchRes.body.data.price === 42, 'Price must be updated to 42');
    assert(ownerPatchRes.body.data.quantity === 600, 'Quantity must be updated to 600');
    assert(ownerPatchRes.body.data.farmerId === farmer1Id, 'farmerId must NOT be changed via PATCH');
    assert(ownerPatchRes.body.data.status === ListingStatus.AVAILABLE, 'status must NOT be changed via generic PATCH');

    // 7.2 Delivery charge normalization for BUYER_PICKUP
    const deliveryNormRes = await httpRequest(port, {
      method: 'PATCH',
      path: `/api/listings/${createdListingId}`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { deliveryType: DeliveryType.BUYER_PICKUP, deliveryCharge: 150 },
    });
    assert(deliveryNormRes.status === 200, 'Delivery norm patch must return 200');
    assert(deliveryNormRes.body.data.deliveryCharge === 0, 'BUYER_PICKUP must reset deliveryCharge to 0');
    console.log('  ✓ Owner update and mass assignment protection passed.');

    // ==========================================
    // 8. Status Transitions: Mark SOLD & Immutability
    // ==========================================
    console.log('[Test:Listings] 8. Testing status transitions and SOLD immutability...');

    // 8.1 Mark as SOLD
    const markSoldRes = await httpRequest(port, {
      method: 'PATCH',
      path: `/api/listings/${createdListingId}/status`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { status: ListingStatus.SOLD },
    });
    assert(markSoldRes.status === 200, 'Mark SOLD must return 200');
    assert(markSoldRes.body.data.status === ListingStatus.SOLD, 'Status must be SOLD');

    // 8.2 Attempt to revert SOLD -> AVAILABLE must fail
    const revertRes = await httpRequest(port, {
      method: 'PATCH',
      path: `/api/listings/${createdListingId}/status`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { status: ListingStatus.AVAILABLE },
    });
    assert(revertRes.status === 400, 'Reverting SOLD to AVAILABLE must be rejected with 400');

    // 8.3 Attempt to edit a SOLD listing must fail
    const editSoldRes = await httpRequest(port, {
      method: 'PATCH',
      path: `/api/listings/${createdListingId}`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { price: 100 },
    });
    assert(editSoldRes.status === 400, 'Editing a SOLD listing must be rejected with 400');

    // 8.4 Attempt to delete a SOLD listing must fail (preserves transaction records)
    const deleteSoldRes = await httpRequest(port, {
      method: 'DELETE',
      path: `/api/listings/${createdListingId}`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    assert(deleteSoldRes.status === 400, 'Deleting a SOLD listing must be rejected with 400');
    console.log('  ✓ Status transition and SOLD immutability passed.');

    // ==========================================
    // 9. Deletion of Available Listing
    // ==========================================
    console.log('[Test:Listings] 9. Testing available listing deletion...');
    const createSecondRes = await httpRequest(port, {
      method: 'POST',
      path: '/api/listings',
      headers: { Authorization: `Bearer ${farmer1Token}` },
      body: { ...validPayload, cropName: 'Crop to Delete' },
    });
    assert(createSecondRes.status === 201, 'Creation of second listing must return 201');
    const toDeleteId = createSecondRes.body.data.id;

    const deleteRes = await httpRequest(port, {
      method: 'DELETE',
      path: `/api/listings/${toDeleteId}`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    assert(deleteRes.status === 200, 'Owner deletion must return 200');

    const getDeletedRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/listings/${toDeleteId}`,
      headers: { Authorization: `Bearer ${farmer1Token}` },
    });
    assert(getDeletedRes.status === 404, 'Deleted listing must return 404');
    console.log('  ✓ Owner deletion succeeded.');

    console.log('====================================================');
    console.log('[Test:Listings] ALL LISTING TESTS PASSED CLEANLY');
    console.log('====================================================');
  } finally {
    server.close();
  }
}

runListingTests().catch((err) => {
  console.error('[Test:Listings] Test run failed:', err);
  process.exit(1);
});
