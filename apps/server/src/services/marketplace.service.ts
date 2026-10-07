import mongoose, { Types } from 'mongoose';
import {
  ListingStatus,
  MarketplaceListing,
  MarketplaceQuery,
  PaginatedMarketplaceListings,
  ListingContactInfo,
} from '@rythuconnect/types';
import { CropListing, CropListingDocument } from '../models';
import { defaultCategoryService, CategoryService } from './category.service';

export class MarketplaceNotFoundError extends Error {
  constructor(message: string = 'Crop listing not found or is no longer available') {
    super(message);
    this.name = 'MarketplaceNotFoundError';
  }
}

export class MarketplaceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketplaceValidationError';
  }
}

/**
 * Escapes regex metacharacters to prevent ReDoS and regex query injection.
 */
function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export class MarketplaceService {
  constructor(private categoryService: CategoryService = defaultCategoryService) {}

  /**
   * Retrieves active, available crop listings matching buyer search and filter criteria.
   * Enforces pagination, whitelisted sorting, and sanitizes output to exclude private fields.
   */
  async getMarketplaceListings(
    query: MarketplaceQuery
  ): Promise<PaginatedMarketplaceListings> {
    const mongoQuery: Record<string, unknown> = {
      status: ListingStatus.AVAILABLE,
    };

    // Crop name search (case-insensitive, regex-escaped, length-bounded)
    if (query.search && query.search.trim().length > 0) {
      const sanitizedSearch = escapeRegex(query.search.trim().slice(0, 100));
      mongoQuery.cropName = { $regex: new RegExp(sanitizedSearch, 'i') };
    }

    // Category filter (validates that category exists and is active)
    if (query.categoryId && query.categoryId.trim().length > 0) {
      const catId = query.categoryId.trim();
      if (!mongoose.Types.ObjectId.isValid(catId)) {
        throw new MarketplaceValidationError('Invalid category ID format');
      }
      const isCategoryValid = await this.categoryService.isValidActiveCategory(catId);
      if (!isCategoryValid) {
        throw new MarketplaceValidationError('Selected category is invalid or inactive');
      }
      mongoQuery.categoryId = new Types.ObjectId(catId);
    }

    // Price range filter
    const minPrice = query.minPrice !== undefined && query.minPrice !== null
      ? Number(query.minPrice)
      : undefined;
    const maxPrice = query.maxPrice !== undefined && query.maxPrice !== null
      ? Number(query.maxPrice)
      : undefined;

    if (minPrice !== undefined && (Number.isNaN(minPrice) || !Number.isFinite(minPrice) || minPrice < 0)) {
      throw new MarketplaceValidationError('minPrice must be a finite non-negative number');
    }
    if (maxPrice !== undefined && (Number.isNaN(maxPrice) || !Number.isFinite(maxPrice) || maxPrice < 0)) {
      throw new MarketplaceValidationError('maxPrice must be a finite non-negative number');
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new MarketplaceValidationError('minPrice cannot be greater than maxPrice');
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Record<string, number> = {};
      if (minPrice !== undefined) {
        priceFilter.$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        priceFilter.$lte = maxPrice;
      }
      mongoQuery.price = priceFilter;
    }

    // Location text filter (case-insensitive, regex-escaped)
    if (query.location && query.location.trim().length > 0) {
      const sanitizedLocation = escapeRegex(query.location.trim().slice(0, 100));
      mongoQuery.location = { $regex: new RegExp(sanitizedLocation, 'i') };
    }

    // Whitelisted sort options
    let sortOptions: Record<string, 1 | -1> = { createdAt: -1 };
    switch (query.sort) {
      case 'price_asc':
        sortOptions = { price: 1, createdAt: -1 };
        break;
      case 'price_desc':
        sortOptions = { price: -1, createdAt: -1 };
        break;
      case 'harvest_date':
        sortOptions = { harvestDate: -1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortOptions = { createdAt: -1 };
        break;
    }

    // Safe bounded pagination
    const page = Math.min(1000, Math.max(1, Number(query.page) || 1));
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 12));
    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      CropListing.countDocuments(mongoQuery),
      CropListing.find(mongoQuery)
        .sort(sortOptions as any)
        .skip(skip)
        .limit(limit)
        .populate('categoryId')
        .populate({
          path: 'farmerId',
          select: '_id isVerified',
        }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const items = docs.map((doc) => this.formatMarketplaceListing(doc));

    return {
      items,
      page,
      limit,
      total,
      totalPages,
    };
  }

  /**
   * Retrieves a single available crop listing by ID for buyer detail presentation.
   */
  async getMarketplaceListingById(id: string): Promise<MarketplaceListing> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new MarketplaceNotFoundError();
    }

    const doc = await CropListing.findOne({
      _id: new Types.ObjectId(id),
      status: ListingStatus.AVAILABLE,
    })
      .populate('categoryId')
      .populate({
        path: 'farmerId',
        select: '_id isVerified role',
      });

    if (!doc) {
      throw new MarketplaceNotFoundError();
    }

    return this.formatMarketplaceListing(doc);
  }

  /**
   * Retrieves verified farmer contact details for authorized buyers initiating WhatsApp contact.
   * Validates that listing is AVAILABLE and never logs phone numbers.
   */
  async getListingContact(id: string): Promise<ListingContactInfo> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new MarketplaceNotFoundError();
    }

    const doc = await CropListing.findOne({
      _id: new Types.ObjectId(id),
      status: ListingStatus.AVAILABLE,
    }).populate({
      path: 'farmerId',
      select: '_id phone isVerified',
    });

    if (!doc) {
      throw new MarketplaceNotFoundError();
    }

    const farmer = doc.farmerId as any;
    if (!farmer || !farmer.phone) {
      throw new MarketplaceNotFoundError('Farmer contact information not available');
    }

    return {
      farmerPhone: farmer.phone,
      isVerified: Boolean(farmer.isVerified),
      cropName: doc.cropName,
    };
  }

  /**
   * Formats CropListing document into clean MarketplaceListing DTO, ensuring farmer phone
   * and private auth credentials are never leaked.
   */
  private formatMarketplaceListing(doc: CropListingDocument): MarketplaceListing {
    const raw = doc.toJSON() as any;
    const populatedCategory = doc.populated('categoryId');
    const populatedFarmer = doc.populated('farmerId');

    let categoryObj = raw.categoryId;
    let categoryId = raw.categoryId;

    if (populatedCategory) {
      const catDoc = (doc as any).categoryId;
      if (catDoc && typeof catDoc === 'object') {
        categoryObj = typeof catDoc.toJSON === 'function' ? catDoc.toJSON() : catDoc;
        categoryId = catDoc.id || catDoc._id?.toString() || categoryId;
      }
    }

    let farmerInfo = undefined;
    if (populatedFarmer) {
      const farmerDoc = (doc as any).farmerId;
      if (farmerDoc && typeof farmerDoc === 'object') {
        farmerInfo = {
          id: farmerDoc.id || farmerDoc._id?.toString(),
          isVerified: Boolean(farmerDoc.isVerified),
        };
      }
    }

    return {
      id: raw.id,
      farmerId: typeof raw.farmerId === 'object' && raw.farmerId !== null
        ? (raw.farmerId.id || raw.farmerId._id?.toString())
        : raw.farmerId,
      categoryId,
      category: categoryObj,
      cropName: raw.cropName,
      quantity: raw.quantity,
      quantityUnit: raw.quantityUnit,
      price: raw.price,
      harvestDate: raw.harvestDate,
      images: Array.isArray(raw.images) ? raw.images : [],
      deliveryType: raw.deliveryType,
      deliveryCharge: raw.deliveryCharge,
      location: raw.location,
      coordinates: raw.coordinates,
      status: raw.status,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      farmer: farmerInfo,
    };
  }
}

export const defaultMarketplaceService = new MarketplaceService();
