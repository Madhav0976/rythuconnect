/**
 * Foundation API Response Envelope
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  timestamp?: string;
}

/**
 * Health Check Response
 */
export interface HealthStatus {
  success: boolean;
  message: string;
  timestamp: string;
  environment: string;
  database: {
    connected: boolean;
  };
}

/**
 * Supported User Roles
 */
export enum UserRole {
  FARMER = 'FARMER',
  BUYER = 'BUYER',
  ADMIN = 'ADMIN',
}

/**
 * Supported Language Codes
 */
export enum LanguageCode {
  EN = 'en',
  TE = 'te',
  HI = 'hi',
}

/**
 * GeoJSON 2D Point representation [longitude, latitude]
 */
export interface GeoPoint {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

/**
 * Supported Delivery Modes for Crop Listings
 */
export enum DeliveryType {
  BUYER_PICKUP = 'BUYER_PICKUP',
  FARMER_DELIVERY = 'FARMER_DELIVERY',
}

/**
 * Supported Crop Listing Statuses
 */
export enum ListingStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD = 'SOLD',
  EXPIRED = 'EXPIRED',
}

/**
 * Standard Agricultural Quantity Units
 */
export enum QuantityUnit {
  KG = 'KG',
  QUINTAL = 'QUINTAL',
  TON = 'TON',
  BAG = 'BAG',
  CRATE = 'CRATE',
  PIECE = 'PIECE',
}

/**
 * Multilingual Translation Map
 */
export interface LocalizedText {
  [key: string]: string | undefined;
  en?: string;
  te?: string;
  hi?: string;
}

/**
 * User Identity Domain Contract
 */
export interface User {
  id: string;
  phone: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  isVerified: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * JWT Authentication Payload
 */
export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
}

/**
 * Sanitized User Identity returned in Auth responses
 */
export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  preferredLanguage: LanguageCode;
  isVerified: boolean;
}

/**
 * Request payload for sending an OTP
 */
export interface SendOtpRequest {
  phone: string;
}

/**
 * Request payload for verifying an OTP
 */
export interface VerifyOtpRequest {
  phone: string;
  otp: string;
  role?: UserRole.FARMER | UserRole.BUYER;
  preferredLanguage?: LanguageCode;
}

/**
 * Auth response data containing JWT and user profile
 */
export interface AuthResponseData {
  token: string;
  user: AuthUser;
}

/**
 * Farmer Profile Domain Contract
 */
export interface FarmerProfile {
  id: string;
  userId: string;
  farmLocation: string;
  coordinates?: GeoPoint;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Buyer Profile Domain Contract
 */
export interface BuyerProfile {
  id: string;
  userId: string;
  deliveryAddress: string;
  businessName?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Crop Category Domain Contract
 */
export interface Category {
  id: string;
  name: string;
  translations?: LocalizedText;
  slug: string;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Crop Listing Domain Contract
 */
export interface CropListing {
  id: string;
  farmerId: string;
  categoryId: string;
  cropName: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  price: number;
  harvestDate: string | Date;
  images: string[];
  deliveryType: DeliveryType;
  deliveryCharge?: number;
  location: string;
  coordinates?: GeoPoint;
  status: ListingStatus;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/**
 * Populated Crop Listing with associated Category
 */
export interface PopulatedCropListing extends Omit<CropListing, 'categoryId'> {
  categoryId: Category | string;
  category?: Category;
}

/**
 * Request payload for creating a new crop listing
 */
export interface CreateListingRequest {
  cropName: string;
  categoryId: string;
  quantity: number;
  quantityUnit: QuantityUnit;
  price: number;
  harvestDate: string | Date;
  deliveryType: DeliveryType;
  deliveryCharge?: number;
  location: string;
  coordinates?: GeoPoint;
  images?: string[];
}

/**
 * Request payload for updating an existing crop listing
 */
export interface UpdateListingRequest {
  cropName?: string;
  categoryId?: string;
  quantity?: number;
  quantityUnit?: QuantityUnit;
  price?: number;
  harvestDate?: string | Date;
  deliveryType?: DeliveryType;
  deliveryCharge?: number;
  location?: string;
  coordinates?: GeoPoint;
  images?: string[];
}

/**
 * Request payload for mutating listing status
 */
export interface UpdateListingStatusRequest {
  status: ListingStatus.SOLD;
}

/**
 * Farmer listing metrics for dashboard overview
 */
export interface FarmerDashboardStats {
  totalListings: number;
  activeListings: number;
  soldListings: number;
  expiredListings: number;
}
