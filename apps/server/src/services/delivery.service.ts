import mongoose, { Types } from 'mongoose';
import {
  DeliveryType,
  ListingStatus,
  DeliveryEstimateRequest,
  DeliveryEstimateResult,
  DeliveryFeeBreakdown,
} from '@rythuconnect/types';
import { CropListing } from '../models';

export class DeliveryNotFoundError extends Error {
  constructor(message: string = 'Crop listing not found') {
    super(message);
    this.name = 'DeliveryNotFoundError';
  }
}

export class DeliveryValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DeliveryValidationError';
  }
}

/**
 * Platform delivery pricing configuration.
 * Centralized, deterministic, and testable.
 */
export interface DeliveryEngineConfig {
  defaultBaseFee: number; // INR
  ratePerKm: number;      // INR per km
  currency: string;
}

export const DEFAULT_DELIVERY_CONFIG: DeliveryEngineConfig = {
  defaultBaseFee: 30,
  ratePerKm: 5,
  currency: 'INR',
};

/**
 * Calculates geographic great-circle distance using the Haversine formula.
 *
 * Canonical coordinate convention: GeoJSON [longitude, latitude]
 * @param origin [lon1, lat1]
 * @param destination [lon2, lat2]
 * @returns distance in kilometers, rounded to 2 decimal places
 */
export function calculateHaversineDistanceKm(
  origin: [number, number],
  destination: [number, number]
): number {
  if (!Array.isArray(origin) || !Array.isArray(destination)) {
    throw new DeliveryValidationError('Coordinates must be arrays of numbers');
  }

  if (origin.length !== 2 || destination.length !== 2) {
    throw new DeliveryValidationError('Coordinates must contain exactly 2 numbers: [longitude, latitude]');
  }

  const [lon1, lat1] = origin;
  const [lon2, lat2] = destination;

  if (
    typeof lon1 !== 'number' ||
    typeof lat1 !== 'number' ||
    typeof lon2 !== 'number' ||
    typeof lat2 !== 'number' ||
    !Number.isFinite(lon1) ||
    !Number.isFinite(lat1) ||
    !Number.isFinite(lon2) ||
    !Number.isFinite(lat2)
  ) {
    throw new DeliveryValidationError('Coordinates must be finite scalar numbers');
  }

  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    throw new DeliveryValidationError('Longitude must be between -180 and 180');
  }

  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    throw new DeliveryValidationError('Latitude must be between -90 and 90');
  }

  const EARTH_RADIUS_KM = 6371; // Mean Earth radius in kilometers

  const toRad = (degrees: number) => (degrees * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Clamp a to [0, 1] to prevent floating-point drift from producing NaN in Math.sqrt(1 - a)
  const safeA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(safeA), Math.sqrt(1 - safeA));

  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 100) / 100;
}

/**
 * Calculates delivery fee deterministically based on distance and listing base fee.
 *
 * @param distanceKm Distance in kilometers
 * @param customBaseFee Optional custom base fee specified by farmer on listing
 * @param config Delivery engine configuration
 */
export function calculateDeliveryCharge(
  distanceKm: number,
  customBaseFee?: number,
  config: DeliveryEngineConfig = DEFAULT_DELIVERY_CONFIG
): {
  totalCharge: number;
  breakdown: DeliveryFeeBreakdown;
} {
  const baseCharge =
    customBaseFee !== undefined && customBaseFee !== null && customBaseFee > 0
      ? customBaseFee
      : config.defaultBaseFee;

  const distanceCharge = Math.round(distanceKm * config.ratePerKm * 100) / 100;
  const totalCharge = Math.round((baseCharge + distanceCharge) * 100) / 100;

  return {
    totalCharge,
    breakdown: {
      baseCharge,
      distanceCharge,
      ratePerKm: config.ratePerKm,
    },
  };
}

export class DeliveryService {
  constructor(private config: DeliveryEngineConfig = DEFAULT_DELIVERY_CONFIG) {}

  /**
   * Estimates delivery distance and charge for a crop listing.
   * Authoritative calculation performed on server; buyer cannot supply farmer coordinates.
   */
  async estimateDelivery(
    request: DeliveryEstimateRequest
  ): Promise<DeliveryEstimateResult> {
    const { listingId, destination } = request;

    if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
      throw new DeliveryValidationError('Invalid listing ID format');
    }

    // Fetch authoritative listing fields only (minimal projection)
    const listing = await CropListing.findById(listingId).select(
      'deliveryType deliveryCharge coordinates status'
    );

    if (!listing) {
      throw new DeliveryNotFoundError('Crop listing not found');
    }

    if (listing.status !== ListingStatus.AVAILABLE) {
      throw new DeliveryValidationError(
        `Delivery estimation unavailable: Listing status is ${listing.status}`
      );
    }

    // 1. BUYER_PICKUP: No distance calculation needed, charge is strictly 0
    if (listing.deliveryType === DeliveryType.BUYER_PICKUP) {
      return {
        listingId: listing._id.toString(),
        deliveryType: DeliveryType.BUYER_PICKUP,
        distanceKm: null,
        deliveryCharge: 0,
        currency: this.config.currency,
        isPickup: true,
      };
    }

    // 2. FARMER_DELIVERY: Validate coordinates and compute distance + fee
    if (!destination || !destination.coordinates) {
      throw new DeliveryValidationError(
        'Destination coordinates are required for farmer delivery estimation'
      );
    }

    if (!listing.coordinates || !Array.isArray(listing.coordinates.coordinates)) {
      throw new DeliveryValidationError(
        'Listing does not have origin coordinates configured for delivery estimation'
      );
    }

    const originCoords = listing.coordinates.coordinates as [number, number];
    const destinationCoords = destination.coordinates;

    const distanceKm = calculateHaversineDistanceKm(originCoords, destinationCoords);

    const { totalCharge, breakdown } = calculateDeliveryCharge(
      distanceKm,
      listing.deliveryCharge,
      this.config
    );

    return {
      listingId: listing._id.toString(),
      deliveryType: DeliveryType.FARMER_DELIVERY,
      distanceKm,
      deliveryCharge: totalCharge,
      currency: this.config.currency,
      isPickup: false,
      breakdown,
    };
  }
}
export const defaultDeliveryService = new DeliveryService();
