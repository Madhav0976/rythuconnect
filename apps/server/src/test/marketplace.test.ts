import http from 'http';
import mongoose from 'mongoose';
import {
  UserRole,
  DeliveryType,
  ListingStatus,
  QuantityUnit,
} from '@rythuconnect/types';
import { defaultTokenService } from '../services/auth/token.service';
import { CropListing, Category, User } from '../models';
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

async function runMarketplaceTests() {
  console.log('====================================================');
  console.log('[Test:Marketplace] Running RythuConnect Buyer Marketplace Tests');
  console.log('====================================================');

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

    const activeCategoryId = new mongoose.Types.ObjectId().toString();
    const inactiveCategoryId = new mongoose.Types.ObjectId().toString();

    const mockFarmerUser = {
      _id: new mongoose.Types.ObjectId(farmerId),
      id: farmerId,
      phone: '+919876543210',
      role: UserRole.FARMER,
      isVerified: true,
      toJSON: () => ({
        id: farmerId,
        phone: '+919876543210',
        role: UserRole.FARMER,
        isVerified: true,
      }),
    };

    const mockActiveCategory = {
      _id: new mongoose.Types.ObjectId(activeCategoryId),
      id: activeCategoryId,
      name: 'Vegetables',
      slug: 'vegetables',
      isActive: true,
      toJSON: () => ({
        id: activeCategoryId,
        name: 'Vegetables',
        slug: 'vegetables',
        isActive: true,
      }),
    };

    // Category Mocks
    Category.findById = ((id: any) => {
      const idStr = id?.toString();
      if (idStr === activeCategoryId) {
        return Promise.resolve(mockActiveCategory);
      }
      if (idStr === inactiveCategoryId) {
        return Promise.resolve({
          _id: new mongoose.Types.ObjectId(inactiveCategoryId),
          id: inactiveCategoryId,
          name: 'Old Veggies',
          slug: 'old-veggies',
          isActive: false,
        });
      }
      return Promise.resolve(null);
    }) as any;

    Category.countDocuments = ((query: any) => {
      if (query?._id?.toString() === activeCategoryId && query?.isActive === true) {
        return Promise.resolve(1);
      }
      return Promise.resolve(0);
    }) as any;

    // Sample Listings
    const listing1Id = new mongoose.Types.ObjectId().toString();
    const listing2Id = new mongoose.Types.ObjectId().toString();
    const listing3Id = new mongoose.Types.ObjectId().toString();
    const soldListingId = new mongoose.Types.ObjectId().toString();
    const expiredListingId = new mongoose.Types.ObjectId().toString();

    const mockListingsData = [
      {
        id: listing1Id,
        _id: new mongoose.Types.ObjectId(listing1Id),
        farmerId: mockFarmerUser,
        categoryId: mockActiveCategory,
        cropName: 'Fresh Red Tomatoes',
        quantity: 500,
        quantityUnit: QuantityUnit.KG,
        price: 40,
        harvestDate: new Date('2026-10-01'),
        deliveryType: DeliveryType.BUYER_PICKUP,
        deliveryCharge: 0,
        location: 'Madanapalle, Chittoor',
        status: ListingStatus.AVAILABLE,
        images: ['https://example.com/tomatoes.jpg'],
        createdAt: new Date('2026-10-01T10:00:00Z'),
      },
      {
        id: listing2Id,
        _id: new mongoose.Types.ObjectId(listing2Id),
        farmerId: mockFarmerUser,
        categoryId: mockActiveCategory,
        cropName: 'Organic Potatoes',
        quantity: 1000,
        quantityUnit: QuantityUnit.KG,
        price: 25,
        harvestDate: new Date('2026-10-05'),
        deliveryType: DeliveryType.FARMER_DELIVERY,
        deliveryCharge: 200,
        location: 'Tenali, Guntur',
        status: ListingStatus.AVAILABLE,
        images: ['https://example.com/potatoes.jpg'],
        createdAt: new Date('2026-10-02T10:00:00Z'),
      },
      {
        id: listing3Id,
        _id: new mongoose.Types.ObjectId(listing3Id),
        farmerId: mockFarmerUser,
        categoryId: mockActiveCategory,
        cropName: 'Green Chillies G4',
        quantity: 200,
        quantityUnit: QuantityUnit.KG,
        price: 80,
        harvestDate: new Date('2026-10-03'),
        deliveryType: DeliveryType.BUYER_PICKUP,
        deliveryCharge: 0,
        location: 'Warangal Urban',
        status: ListingStatus.AVAILABLE,
        images: ['https://example.com/chillies.jpg'],
        createdAt: new Date('2026-10-03T10:00:00Z'),
      },
      {
        id: soldListingId,
        _id: new mongoose.Types.ObjectId(soldListingId),
        farmerId: mockFarmerUser,
        categoryId: mockActiveCategory,
        cropName: 'Sweet Carrots',
        quantity: 300,
        quantityUnit: QuantityUnit.KG,
        price: 50,
        harvestDate: new Date('2026-09-20'),
        deliveryType: DeliveryType.BUYER_PICKUP,
        deliveryCharge: 0,
        location: 'Ooty',
        status: ListingStatus.SOLD,
        images: [],
        createdAt: new Date('2026-09-20T10:00:00Z'),
      },
      {
        id: expiredListingId,
        _id: new mongoose.Types.ObjectId(expiredListingId),
        farmerId: mockFarmerUser,
        categoryId: mockActiveCategory,
        cropName: 'Sweet Watermelon',
        quantity: 100,
        quantityUnit: QuantityUnit.CRATE,
        price: 15,
        harvestDate: new Date('2026-08-15'),
        deliveryType: DeliveryType.BUYER_PICKUP,
        deliveryCharge: 0,
        location: 'Kadapa',
        status: ListingStatus.EXPIRED,
        images: [],
        createdAt: new Date('2026-08-15T10:00:00Z'),
      },
    ];

    function wrapDoc(raw: any) {
      return {
        ...raw,
        toJSON: () => ({
          id: raw.id,
          farmerId: typeof raw.farmerId === 'object' ? raw.farmerId.id || raw.farmerId._id.toString() : raw.farmerId,
          categoryId: typeof raw.categoryId === 'object' ? raw.categoryId.id || raw.categoryId._id.toString() : raw.categoryId,
          cropName: raw.cropName,
          quantity: raw.quantity,
          quantityUnit: raw.quantityUnit,
          price: raw.price,
          harvestDate: raw.harvestDate,
          deliveryType: raw.deliveryType,
          deliveryCharge: raw.deliveryCharge,
          location: raw.location,
          status: raw.status,
          images: raw.images,
          createdAt: raw.createdAt,
          updatedAt: raw.createdAt,
        }),
        populated: (field: string) => {
          if (field === 'categoryId') return raw.categoryId;
          if (field === 'farmerId') return raw.farmerId;
          return null;
        },
      };
    }

    function filterDocs(query: any): any[] {
      return mockListingsData.filter((item) => {
        // Status filter
        if (query.status && item.status !== query.status) return false;

        // Crop name regex search
        if (query.cropName && query.cropName.$regex) {
          const regex = query.cropName.$regex instanceof RegExp
            ? query.cropName.$regex
            : new RegExp(query.cropName.$regex, 'i');
          if (!regex.test(item.cropName)) return false;
        }

        // CategoryId
        if (query.categoryId) {
          const itemCatId = (item.categoryId as any).id || (item.categoryId as any)._id?.toString();
          if (itemCatId !== query.categoryId.toString()) return false;
        }

        // Price filter
        if (query.price) {
          if (query.price.$gte !== undefined && item.price < query.price.$gte) return false;
          if (query.price.$lte !== undefined && item.price > query.price.$lte) return false;
        }

        // Location filter
        if (query.location && query.location.$regex) {
          const regex = query.location.$regex instanceof RegExp
            ? query.location.$regex
            : new RegExp(query.location.$regex, 'i');
          if (!regex.test(item.location)) return false;
        }

        return true;
      });
    }

    // Mock CropListing methods
    CropListing.countDocuments = ((query: any) => {
      const filtered = filterDocs(query);
      return Promise.resolve(filtered.length);
    }) as any;

    CropListing.find = ((query: any) => {
      let filtered = filterDocs(query);

      return {
        sort: (sortObj: any) => {
          if (sortObj.price === 1) {
            filtered.sort((a, b) => a.price - b.price);
          } else if (sortObj.price === -1) {
            filtered.sort((a, b) => b.price - a.price);
          } else if (sortObj.harvestDate === -1) {
            filtered.sort((a, b) => b.harvestDate.getTime() - a.harvestDate.getTime());
          } else {
            // Newest default
            filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          }

          return {
            skip: (skipCount: number) => ({
              limit: (limitCount: number) => ({
                populate: () => ({
                  populate: () => Promise.resolve(filtered.slice(skipCount, skipCount + limitCount).map(wrapDoc)),
                }),
              }),
            }),
          };
        },
      };
    }) as any;

    function makeQuery(result: any) {
      const q: any = {
        populate: () => q,
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
        catch: (reject: any) => Promise.resolve(result).catch(reject),
      };
      return q;
    }

    CropListing.findOne = ((query: any) => {
      const idStr = query._id?.toString();
      const statusReq = query.status;

      const found = mockListingsData.find(
        (l) => l.id === idStr && (!statusReq || l.status === statusReq)
      );

      return makeQuery(found ? wrapDoc(found) : null);
    }) as any;

    // ==========================================
    // 1-3. AVAILABLE listings returned, SOLD and EXPIRED excluded
    // ==========================================
    console.log('[Test:Marketplace] 1-3. Testing Available listings retrieval (excluding SOLD/EXPIRED)...');
    const availableRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings',
    });
    assert(availableRes.status === 200, 'Marketplace listings must return 200');
    assert(availableRes.body.success === true, 'Success must be true');
    assert(availableRes.body.data.total === 3, `Expected 3 available listings, got ${availableRes.body.data.total}`);
    assert(availableRes.body.data.items.length === 3, 'Items array length should match total');

    // Verify none of the items are SOLD or EXPIRED
    const statuses = availableRes.body.data.items.map((i: any) => i.status);
    assert(!statuses.includes('SOLD'), 'SOLD listings must be strictly excluded');
    assert(!statuses.includes('EXPIRED'), 'EXPIRED listings must be strictly excluded');
    console.log('  ✓ Available listings returned with SOLD and EXPIRED excluded.');

    // ==========================================
    // 4. Crop name search
    // ==========================================
    console.log('[Test:Marketplace] 4. Testing crop name search...');
    const searchRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?search=tomato',
    });
    assert(searchRes.status === 200, 'Search should return 200');
    assert(searchRes.body.data.total === 1, 'Search for tomato should return exactly 1 item');
    assert(searchRes.body.data.items[0].cropName === 'Fresh Red Tomatoes', 'Item must be Fresh Red Tomatoes');
    console.log('  ✓ Search works as expected.');

    // ==========================================
    // 5. Category filter
    // ==========================================
    console.log('[Test:Marketplace] 5. Testing category filter...');
    const catFilterRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings?categoryId=${activeCategoryId}`,
    });
    assert(catFilterRes.status === 200, 'Category filter should return 200');
    assert(catFilterRes.body.data.total === 3, 'All 3 available items are in Vegetables category');
    console.log('  ✓ Category filter works.');

    // ==========================================
    // 6-7. Price range filter (minPrice, maxPrice)
    // ==========================================
    console.log('[Test:Marketplace] 6-7. Testing price range filter...');
    const minPriceRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?minPrice=30',
    });
    assert(minPriceRes.body.data.total === 2, 'minPrice=30 should filter out potatoes (price 25)');

    const maxPriceRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?maxPrice=50',
    });
    assert(maxPriceRes.body.data.total === 2, 'maxPrice=50 should filter out chillies (price 80)');

    const priceRangeRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?minPrice=30&maxPrice=50',
    });
    assert(priceRangeRes.body.data.total === 1, 'minPrice=30 and maxPrice=50 should leave only tomatoes (40)');
    console.log('  ✓ Price range filters work.');

    // ==========================================
    // 8. minPrice > maxPrice rejected
    // ==========================================
    console.log('[Test:Marketplace] 8. Testing invalid price range rejection (minPrice > maxPrice)...');
    const invalidPriceRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?minPrice=100&maxPrice=50',
    });
    assert(invalidPriceRes.status === 400, 'minPrice > maxPrice must return 400');
    assert(invalidPriceRes.body.success === false, 'success must be false');

    const excessPriceRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?minPrice=10000001',
    });
    assert(excessPriceRes.status === 400, 'minPrice > 10,000,000 must return 400');
    console.log('  ✓ minPrice > maxPrice and upper bound rejected properly.');

    // ==========================================
    // 9. Sorting whitelist works
    // ==========================================
    console.log('[Test:Marketplace] 9. Testing sorting whitelist...');
    const sortAscRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?sort=price_asc',
    });
    const ascPrices = sortAscRes.body.data.items.map((i: any) => i.price);
    assert(ascPrices[0] === 25 && ascPrices[1] === 40 && ascPrices[2] === 80, 'price_asc sort must order ascending');

    const sortDescRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?sort=price_desc',
    });
    const descPrices = sortDescRes.body.data.items.map((i: any) => i.price);
    assert(descPrices[0] === 80 && descPrices[1] === 40 && descPrices[2] === 25, 'price_desc sort must order descending');
    console.log('  ✓ Whitelisted sorting works.');

    // ==========================================
    // 10. Invalid sort rejected
    // ==========================================
    console.log('[Test:Marketplace] 10. Testing invalid sort rejection...');
    const invalidSortRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?sort=malicious_sort',
    });
    assert(invalidSortRes.status === 400, 'Invalid sort must return 400');
    console.log('  ✓ Invalid sort rejected.');

    // ==========================================
    // 11. Pagination works
    // ==========================================
    console.log('[Test:Marketplace] 11. Testing pagination...');
    const page1Res = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?page=1&limit=2',
    });
    assert(page1Res.status === 200, 'Page 1 should return 200');
    assert(page1Res.body.data.items.length === 2, 'Page 1 limit 2 should return 2 items');
    assert(page1Res.body.data.page === 1, 'Page metadata should be 1');
    assert(page1Res.body.data.totalPages === 2, 'Total pages should be 2');

    const page2Res = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?page=2&limit=2',
    });
    assert(page2Res.body.data.items.length === 1, 'Page 2 limit 2 should return 1 item');
    assert(page2Res.body.data.page === 2, 'Page metadata should be 2');
    console.log('  ✓ Pagination works.');

    // ==========================================
    // 12. Pagination limit bounded (<= 50)
    // ==========================================
    console.log('[Test:Marketplace] 12. Testing pagination limit boundary...');
    const excessLimitRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?limit=100',
    });
    assert(excessLimitRes.status === 400, 'limit > 50 must return 400');

    const negativePageRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?page=0',
    });
    assert(negativePageRes.status === 400, 'page < 1 must return 400');

    const excessPageRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?page=1001',
    });
    assert(excessPageRes.status === 400, 'page > 1000 must return 400');
    console.log('  ✓ Pagination parameters bounded safely.');

    // ==========================================
    // 13. Invalid ObjectId handled
    // ==========================================
    console.log('[Test:Marketplace] 13. Testing invalid ObjectId handling...');
    const invalidIdRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings/not-a-valid-id',
    });
    assert(invalidIdRes.status === 400, 'Invalid listing ID must return 400');
    console.log('  ✓ Invalid ObjectId handled.');

    // ==========================================
    // 14. Invalid category handled
    // ==========================================
    console.log('[Test:Marketplace] 14. Testing invalid/inactive category handling...');
    const invalidCatRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?categoryId=invalid-cat-format',
    });
    assert(invalidCatRes.status === 400, 'Malformed category ID must return 400');

    const inactiveCatRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings?categoryId=${inactiveCategoryId}`,
    });
    assert(inactiveCatRes.status === 400, 'Inactive category ID must return 400');
    console.log('  ✓ Invalid and inactive category IDs rejected.');

    // ==========================================
    // 15. Buyer access works
    // ==========================================
    console.log('[Test:Marketplace] 15. Testing authenticated buyer access...');
    const buyerMarketplaceRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings',
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert(buyerMarketplaceRes.status === 200, 'Buyer must be able to browse marketplace');
    console.log('  ✓ Buyer access confirmed.');

    // ==========================================
    // 16. Farmer cannot access buyer-only contact endpoint
    // ==========================================
    console.log('[Test:Marketplace] 16. Testing farmer role restriction on contact endpoint...');
    const farmerContactRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings/${listing1Id}/contact`,
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert(farmerContactRes.status === 403, 'FARMER must receive 403 on buyer-only contact endpoint');

    const unauthContactRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings/${listing1Id}/contact`,
    });
    assert(unauthContactRes.status === 401, 'Unauthenticated request must receive 401 on contact endpoint');
    console.log('  ✓ Farmer and unauthenticated access prohibited on contact endpoint.');

    // ==========================================
    // 17. Marketplace detail for AVAILABLE works
    // ==========================================
    console.log('[Test:Marketplace] 17. Testing marketplace detail for AVAILABLE listing...');
    const detailRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings/${listing1Id}`,
    });
    assert(detailRes.status === 200, 'Available listing detail must return 200');
    assert(detailRes.body.data.cropName === 'Fresh Red Tomatoes', 'Detail data must match crop name');
    assert(detailRes.body.data.farmer !== undefined, 'Farmer info object must be present');
    assert(detailRes.body.data.farmer.isVerified === true, 'Farmer isVerified flag should be true');
    console.log('  ✓ Marketplace detail for AVAILABLE listing works.');

    // ==========================================
    // 18. Marketplace detail for SOLD/EXPIRED rejected/not found
    // ==========================================
    console.log('[Test:Marketplace] 18. Testing marketplace detail for SOLD/EXPIRED listings...');
    const soldDetailRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings/${soldListingId}`,
    });
    assert(soldDetailRes.status === 404, 'SOLD listing detail must return 404 in marketplace');

    const expiredDetailRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings/${expiredListingId}`,
    });
    assert(expiredDetailRes.status === 404, 'EXPIRED listing detail must return 404 in marketplace');
    console.log('  ✓ SOLD and EXPIRED listings return 404.');

    // ==========================================
    // 19. Phone number is not leaked in normal listing response
    // ==========================================
    console.log('[Test:Marketplace] 19. Auditing phone privacy in normal listing responses...');
    const searchBody = JSON.stringify(availableRes.body);
    const detailBody = JSON.stringify(detailRes.body);
    assert(!searchBody.includes('+919876543210'), 'Phone number must NOT leak in listing list response');
    assert(!detailBody.includes('+919876543210'), 'Phone number must NOT leak in listing detail response');
    console.log('  ✓ No phone number leaked in normal responses.');

    // ==========================================
    // 20. Authorized WhatsApp/contact flow returns only required data
    // ==========================================
    console.log('[Test:Marketplace] 20. Testing authorized contact endpoint flow...');
    const buyerContactRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings/${listing1Id}/contact`,
      headers: { Authorization: `Bearer ${buyerToken}` },
    });
    assert(buyerContactRes.status === 200, 'Authorized buyer contact request must return 200');
    assert(buyerContactRes.body.data.farmerPhone === '+919876543210', 'Farmer phone should be returned to buyer');
    assert(buyerContactRes.body.data.isVerified === true, 'Farmer isVerified should be true');
    assert(buyerContactRes.body.data.cropName === 'Fresh Red Tomatoes', 'cropName should be returned');
    assert(buyerContactRes.body.data.password === undefined, 'No sensitive auth credentials returned');
    console.log('  ✓ Authorized WhatsApp contact flow verified.');

    // ==========================================
    // 21. Injection-like search input safely handled
    // ==========================================
    console.log('[Test:Marketplace] 21. Testing injection-like search input safety...');
    const injectionRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?search=.*%2B%5C%5B%5D%28%29%24%5E',
    });
    assert(injectionRes.status === 200, 'Regex metacharacters must be safely escaped without throwing error');
    assert(injectionRes.body.data.total === 0, 'No false positive match should occur for regex metacharacters');
    console.log('  ✓ Injection-like search input safely handled.');

    // ==========================================
    // 22. Query parameter pollution defense (array injection)
    // ==========================================
    console.log('[Test:Marketplace] 22. Testing query parameter array pollution defense...');
    const pollutionRes = await httpRequest(port, {
      method: 'GET',
      path: '/api/marketplace/listings?sort=price_asc&sort=price_desc',
    });
    assert(pollutionRes.status === 400, 'Array pollution on sort parameter must return 400');

    const catPollutionRes = await httpRequest(port, {
      method: 'GET',
      path: `/api/marketplace/listings?categoryId=${activeCategoryId}&categoryId=${inactiveCategoryId}`,
    });
    assert(catPollutionRes.status === 400, 'Array pollution on categoryId parameter must return 400');
    console.log('  ✓ Query parameter pollution properly rejected with 400.');

    console.log('====================================================');
    console.log('[Test:Marketplace] ALL 22 BUYER MARKETPLACE TESTS PASSED CLEANLY');
    console.log('====================================================');

    server.close(() => process.exit(0));
  } catch (err: any) {
    console.error('[Test:Marketplace] Failed:', err.message);
    server.close(() => process.exit(1));
  }
}

runMarketplaceTests().catch((err) => {
  console.error('[Test:Marketplace] Fatal error:', err);
  process.exit(1);
});
