import mongoose, { Types } from 'mongoose';
import {
  CreateListingRequest,
  UpdateListingRequest,
  ListingStatus,
  DeliveryType,
  FarmerDashboardStats,
  PopulatedCropListing,
} from '@rythuconnect/types';
import { CropListing, CropListingDocument, Category } from '../models';
import { defaultCategoryService, CategoryService } from './category.service';

export class ListingForbiddenError extends Error {
  constructor(message: string = 'You do not have permission to modify this listing') {
    super(message);
    this.name = 'ListingForbiddenError';
  }
}

export class ListingNotFoundError extends Error {
  constructor(message: string = 'Crop listing not found') {
    super(message);
    this.name = 'ListingNotFoundError';
  }
}

export class ListingValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ListingValidationError';
  }
}

export class ListingService {
  constructor(private categoryService: CategoryService = defaultCategoryService) {}

  /**
   * Creates a new crop listing for the authenticated farmer.
   */
  async createListing(
    farmerId: string,
    data: CreateListingRequest
  ): Promise<PopulatedCropListing> {
    const isCategoryValid = await this.categoryService.isValidActiveCategory(data.categoryId);
    if (!isCategoryValid) {
      throw new ListingValidationError('Invalid or inactive category selected');
    }

    const listing = new CropListing({
      farmerId: new Types.ObjectId(farmerId),
      categoryId: new Types.ObjectId(data.categoryId),
      cropName: data.cropName.trim(),
      quantity: Number(data.quantity),
      quantityUnit: data.quantityUnit,
      price: Number(data.price),
      harvestDate: new Date(data.harvestDate),
      images: Array.isArray(data.images) ? data.images : [],
      deliveryType: data.deliveryType,
      deliveryCharge:
        data.deliveryType === DeliveryType.FARMER_DELIVERY && data.deliveryCharge
          ? Number(data.deliveryCharge)
          : 0,
      location: data.location.trim(),
      coordinates: data.coordinates,
      status: ListingStatus.AVAILABLE, // Always starts as AVAILABLE
    });

    await listing.save();
    await listing.populate('categoryId');

    return this.formatPopulatedListing(listing);
  }

  /**
   * Retrieves all listings belonging to the authenticated farmer.
   */
  async getFarmerListings(
    farmerId: string,
    statusFilter?: ListingStatus
  ): Promise<PopulatedCropListing[]> {
    const query: Record<string, unknown> = {
      farmerId: new Types.ObjectId(farmerId),
    };

    if (statusFilter && Object.values(ListingStatus).includes(statusFilter)) {
      query.status = statusFilter;
    }

    const listings = await CropListing.find(query)
      .sort({ createdAt: -1 })
      .populate('categoryId');

    return listings.map((l) => this.formatPopulatedListing(l));
  }

  /**
   * Computes farmer dashboard listing counts.
   */
  async getFarmerDashboardStats(farmerId: string): Promise<FarmerDashboardStats> {
    const objectId = new Types.ObjectId(farmerId);

    const [totalListings, activeListings, soldListings, expiredListings] = await Promise.all([
      CropListing.countDocuments({ farmerId: objectId }),
      CropListing.countDocuments({ farmerId: objectId, status: ListingStatus.AVAILABLE }),
      CropListing.countDocuments({ farmerId: objectId, status: ListingStatus.SOLD }),
      CropListing.countDocuments({ farmerId: objectId, status: ListingStatus.EXPIRED }),
    ]);

    return {
      totalListings,
      activeListings,
      soldListings,
      expiredListings,
    };
  }

  /**
   * Retrieves a single crop listing by its ID.
   */
  async getListingById(id: string): Promise<PopulatedCropListing> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ListingNotFoundError();
    }

    const listing = await CropListing.findById(id).populate('categoryId');
    if (!listing) {
      throw new ListingNotFoundError();
    }

    return this.formatPopulatedListing(listing);
  }

  /**
   * Updates an existing crop listing with server-side ownership verification.
   */
  async updateListing(
    id: string,
    farmerId: string,
    data: UpdateListingRequest
  ): Promise<PopulatedCropListing> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ListingNotFoundError();
    }

    const listing = await CropListing.findById(id);
    if (!listing) {
      throw new ListingNotFoundError();
    }

    // Ownership verification
    if (listing.farmerId.toString() !== farmerId) {
      throw new ListingForbiddenError('You do not own this crop listing');
    }

    // Cannot edit sold listings
    if (listing.status === ListingStatus.SOLD) {
      throw new ListingValidationError('Sold crop listings cannot be modified');
    }

    // Validate new category if provided
    if (data.categoryId) {
      const isCategoryValid = await this.categoryService.isValidActiveCategory(data.categoryId);
      if (!isCategoryValid) {
        throw new ListingValidationError('Invalid or inactive category selected');
      }
      listing.categoryId = new Types.ObjectId(data.categoryId);
    }

    if (data.cropName !== undefined) listing.cropName = data.cropName.trim();
    if (data.quantity !== undefined) listing.quantity = Number(data.quantity);
    if (data.quantityUnit !== undefined) listing.quantityUnit = data.quantityUnit;
    if (data.price !== undefined) listing.price = Number(data.price);
    if (data.harvestDate !== undefined) listing.harvestDate = new Date(data.harvestDate);
    if (data.deliveryType !== undefined) {
      listing.deliveryType = data.deliveryType;
      if (data.deliveryType === DeliveryType.BUYER_PICKUP) {
        listing.deliveryCharge = 0;
      }
    }
    if (data.deliveryCharge !== undefined) {
      listing.deliveryCharge =
        listing.deliveryType === DeliveryType.FARMER_DELIVERY ? Number(data.deliveryCharge) : 0;
    }
    if (data.location !== undefined) listing.location = data.location.trim();
    if (data.coordinates !== undefined) listing.coordinates = data.coordinates;
    if (data.images !== undefined) listing.images = Array.isArray(data.images) ? data.images : [];

    await listing.save();
    await listing.populate('categoryId');

    return this.formatPopulatedListing(listing);
  }

  /**
   * Transitions listing status with strict transition rules (AVAILABLE -> SOLD only).
   */
  async updateListingStatus(
    id: string,
    farmerId: string,
    newStatus: ListingStatus
  ): Promise<PopulatedCropListing> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ListingNotFoundError();
    }

    const listing = await CropListing.findById(id);
    if (!listing) {
      throw new ListingNotFoundError();
    }

    // Ownership verification
    if (listing.farmerId.toString() !== farmerId) {
      throw new ListingForbiddenError('You do not own this crop listing');
    }

    // Farmers may only transition AVAILABLE -> SOLD
    if (newStatus !== ListingStatus.SOLD) {
      throw new ListingValidationError(`Unsupported status transition to ${newStatus}`);
    }

    if (listing.status === ListingStatus.SOLD) {
      throw new ListingValidationError('Crop listing is already marked as SOLD');
    }

    if (listing.status !== ListingStatus.AVAILABLE) {
      throw new ListingValidationError(
        `Only AVAILABLE listings can be marked as SOLD (current status: ${listing.status})`
      );
    }

    listing.status = ListingStatus.SOLD;
    await listing.save();
    await listing.populate('categoryId');

    return this.formatPopulatedListing(listing);
  }

  /**
   * Deactivates/deletes a crop listing with ownership verification.
   */
  async deleteListing(id: string, farmerId: string): Promise<void> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ListingNotFoundError();
    }

    const listing = await CropListing.findById(id);
    if (!listing) {
      throw new ListingNotFoundError();
    }

    // Ownership verification
    if (listing.farmerId.toString() !== farmerId) {
      throw new ListingForbiddenError('You do not own this crop listing');
    }

    // Sold listings cannot be deleted to preserve transaction records
    if (listing.status === ListingStatus.SOLD) {
      throw new ListingValidationError(
        'Sold crop listings cannot be deleted to preserve transaction records'
      );
    }

    await CropListing.findByIdAndDelete(id);
  }

  /**
   * Converts Mongoose document to clean domain JSON with populated category.
   */
  private formatPopulatedListing(doc: CropListingDocument): PopulatedCropListing {
    const raw = doc.toJSON() as any;
    const populated = doc.populated('categoryId');

    if (populated && typeof raw.categoryId === 'object' && raw.categoryId !== null) {
      return {
        ...raw,
        category: raw.categoryId,
        categoryId: raw.categoryId.id || raw.categoryId._id?.toString(),
      };
    }

    return raw as PopulatedCropListing;
  }
}

export const defaultListingService = new ListingService();
