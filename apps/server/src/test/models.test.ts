import mongoose from 'mongoose';
import {
  User,
  FarmerProfile,
  BuyerProfile,
  Category,
  CropListing,
} from '../models';
import {
  UserRole,
  LanguageCode,
  DeliveryType,
  ListingStatus,
  QuantityUnit,
} from '@rythuconnect/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runModelValidationTests() {
  console.log('[Test:Models] Running offline Mongoose schema & validation tests...');

  // 1. User Model Validation
  console.log('[Test:Models] 1. Testing User schema validation...');
  const validUser = new User({
    phone: '+919876543210',
    role: UserRole.FARMER,
    preferredLanguage: LanguageCode.TE,
    isVerified: true,
  });
  const userValidationErr = validUser.validateSync();
  assert(!userValidationErr, `Valid user should not produce validation errors: ${userValidationErr}`);

  const invalidPhoneUser = new User({
    phone: '123', // too short
    role: UserRole.FARMER,
    preferredLanguage: LanguageCode.TE,
  });
  const phoneErr = invalidPhoneUser.validateSync();
  assert(!!phoneErr && !!phoneErr.errors.phone, 'Invalid phone number must produce validation error');

  const invalidRoleUser = new User({
    phone: '+919876543210',
    role: 'SUPERADMIN', // not in UserRole enum
    preferredLanguage: LanguageCode.EN,
  });
  const roleErr = invalidRoleUser.validateSync();
  assert(!!roleErr && !!roleErr.errors.role, 'Invalid role must produce enum validation error');
  console.log('  ✓ User schema validation passed.');

  // 2. FarmerProfile Validation
  console.log('[Test:Models] 2. Testing FarmerProfile schema validation...');
  const fakeUserId = new mongoose.Types.ObjectId();
  const validFarmer = new FarmerProfile({
    userId: fakeUserId,
    farmLocation: 'Guntur District, Andhra Pradesh',
    coordinates: {
      type: 'Point',
      coordinates: [80.4365, 16.3067], // [longitude, latitude]
    },
  });
  const farmerErr = validFarmer.validateSync();
  assert(!farmerErr, `Valid farmer profile should not produce validation errors: ${farmerErr}`);

  const invalidCoordsFarmer = new FarmerProfile({
    userId: fakeUserId,
    farmLocation: 'Guntur',
    coordinates: {
      type: 'Point',
      coordinates: [200, 100], // invalid ranges
    },
  });
  const coordErr = invalidCoordsFarmer.validateSync();
  assert(!!coordErr && !!coordErr.errors['coordinates.coordinates'], 'Invalid coordinates must fail range validation');
  console.log('  ✓ FarmerProfile schema validation passed.');

  // 3. BuyerProfile Validation
  console.log('[Test:Models] 3. Testing BuyerProfile schema validation...');
  const validBuyer = new BuyerProfile({
    userId: fakeUserId,
    deliveryAddress: 'Road No. 12, Banjara Hills, Hyderabad, Telangana',
    businessName: 'Fresh Organics Mart',
  });
  const buyerErr = validBuyer.validateSync();
  assert(!buyerErr, `Valid buyer profile should not produce validation errors: ${buyerErr}`);

  const missingAddressBuyer = new BuyerProfile({
    userId: fakeUserId,
  });
  const missingAddrErr = missingAddressBuyer.validateSync();
  assert(!!missingAddrErr && !!missingAddrErr.errors.deliveryAddress, 'Missing delivery address must fail validation');
  console.log('  ✓ BuyerProfile schema validation passed.');

  // 4. Category Validation
  console.log('[Test:Models] 4. Testing Category schema validation...');
  const validCategory = new Category({
    name: 'Vegetables',
    slug: 'vegetables',
    translations: {
      en: 'Vegetables',
      te: 'కూరగాయలు',
      hi: 'सब्जियां',
    },
    isActive: true,
  });
  const catErr = validCategory.validateSync();
  assert(!catErr, `Valid category should not produce validation errors: ${catErr}`);

  const invalidSlugCategory = new Category({
    name: 'Invalid Category',
    slug: 'Vegetables & Fruits!', // invalid slug
  });
  const slugErr = invalidSlugCategory.validateSync();
  assert(!!slugErr && !!slugErr.errors.slug, 'Invalid slug regex must fail validation');
  console.log('  ✓ Category schema validation passed.');

  // 5. CropListing Validation
  console.log('[Test:Models] 5. Testing CropListing schema validation...');
  const fakeCategoryId = new mongoose.Types.ObjectId();
  const validListing = new CropListing({
    farmerId: fakeUserId,
    categoryId: fakeCategoryId,
    cropName: 'Sona Masoori Rice',
    quantity: 50,
    quantityUnit: QuantityUnit.BAG,
    price: 1800,
    harvestDate: new Date('2026-09-15'),
    images: ['https://example.com/rice.jpg'],
    deliveryType: DeliveryType.FARMER_DELIVERY,
    deliveryCharge: 250,
    location: 'Tenali, Guntur',
    coordinates: {
      type: 'Point',
      coordinates: [80.648, 16.243],
    },
    status: ListingStatus.AVAILABLE,
  });
  const listingErr = validListing.validateSync();
  assert(!listingErr, `Valid crop listing should not produce validation errors: ${listingErr}`);

  const negativePriceListing = new CropListing({
    farmerId: fakeUserId,
    categoryId: fakeCategoryId,
    cropName: 'Tomato',
    quantity: 0, // min 1
    quantityUnit: QuantityUnit.KG,
    price: -50, // negative price
    harvestDate: new Date(),
    deliveryType: DeliveryType.BUYER_PICKUP,
    location: 'Madanapalle',
    status: ListingStatus.AVAILABLE,
  });
  const priceErr = negativePriceListing.validateSync();
  assert(!!priceErr && !!priceErr.errors.price, 'Negative price must fail min validator');
  assert(!!priceErr && !!priceErr.errors.quantity, 'Zero quantity must fail min validator');
  console.log('  ✓ CropListing schema validation passed.');

  // 6. Check Indexes registered on Schemas
  console.log('[Test:Models] 6. Verifying index registrations...');
  const userIndexes = User.schema.indexes();
  assert(userIndexes.some(([spec]: any[]) => 'role' in spec), 'User schema must index role');

  const farmerIndexes = FarmerProfile.schema.indexes();
  assert(farmerIndexes.some(([spec]: any[]) => spec.coordinates === '2dsphere'), 'FarmerProfile schema must index 2dsphere coordinates');

  const categoryIndexes = Category.schema.indexes();
  assert(categoryIndexes.some(([spec]: any[]) => 'isActive' in spec), 'Category schema must index isActive');

  const listingIndexes = CropListing.schema.indexes();
  assert(listingIndexes.some(([spec]: any[]) => 'farmerId' in spec), 'CropListing schema must index farmerId');
  assert(listingIndexes.some(([spec]: any[]) => 'categoryId' in spec), 'CropListing schema must index categoryId');
  assert(listingIndexes.some(([spec]: any[]) => 'status' in spec), 'CropListing schema must index status');
  assert(listingIndexes.some(([spec]: any[]) => spec.coordinates === '2dsphere'), 'CropListing schema must index 2dsphere coordinates');
  assert(
    listingIndexes.some(
      ([spec]: any[]) => 'categoryId' in spec && 'status' in spec && 'createdAt' in spec
    ),
    'CropListing schema must have compound index on categoryId + status + createdAt'
  );
  console.log('  ✓ All required index specifications verified.');

  console.log('[Test:Models] ALL SCHEMA VALIDATION TESTS PASSED SUCCESSFULLY.');
}

runModelValidationTests().catch((err) => {
  console.error('[Test:Models] Validation test failure:', err);
  process.exit(1);
});
