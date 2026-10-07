import { Schema, model, Document, Model, Types } from 'mongoose';
import {
  CropListing as ICropListing,
  DeliveryType,
  ListingStatus,
  QuantityUnit,
  GeoPoint,
} from '@rythuconnect/types';

export interface CropListingDocument
  extends Omit<ICropListing, 'id' | 'farmerId' | 'categoryId'>,
    Document {
  farmerId: Types.ObjectId;
  categoryId: Types.ObjectId;
}

const pointSchema = new Schema<GeoPoint>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: (coords: number[]) =>
          Array.isArray(coords) &&
          coords.length === 2 &&
          coords[0] >= -180 &&
          coords[0] <= 180 &&
          coords[1] >= -90 &&
          coords[1] <= 90,
        message: 'Coordinates must be [longitude (-180 to 180), latitude (-90 to 90)]',
      },
    },
  },
  { _id: false }
);

const cropListingSchema = new Schema<CropListingDocument>(
  {
    farmerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer (User) reference is required'],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category reference is required'],
    },
    cropName: {
      type: String,
      required: [true, 'Crop name is required'],
      trim: true,
      minlength: [2, 'Crop name must be at least 2 characters long'],
      maxlength: [100, 'Crop name cannot exceed 100 characters'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
    },
    quantityUnit: {
      type: String,
      enum: {
        values: Object.values(QuantityUnit),
        message: '{VALUE} is not a valid quantity unit',
      },
      default: QuantityUnit.KG,
      required: [true, 'Quantity unit is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0.01, 'Price must be a positive number greater than 0'],
    },
    harvestDate: {
      type: Date,
      required: [true, 'Harvest date is required'],
    },
    images: {
      type: [String],
      default: [],
    },
    deliveryType: {
      type: String,
      enum: {
        values: Object.values(DeliveryType),
        message: '{VALUE} is not a valid delivery type',
      },
      default: DeliveryType.BUYER_PICKUP,
      required: [true, 'Delivery type is required'],
    },
    deliveryCharge: {
      type: Number,
      default: 0,
      min: [0, 'Delivery charge cannot be negative'],
    },
    location: {
      type: String,
      required: [true, 'Location is required'],
      trim: true,
      minlength: [2, 'Location must be at least 2 characters long'],
      maxlength: [200, 'Location cannot exceed 200 characters'],
    },
    coordinates: {
      type: pointSchema,
      required: false,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ListingStatus),
        message: '{VALUE} is not a valid listing status',
      },
      default: ListingStatus.AVAILABLE,
      required: [true, 'Listing status is required'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.farmerId = ret.farmerId ? ret.farmerId.toString() : ret.farmerId;
        ret.categoryId = ret.categoryId ? ret.categoryId.toString() : ret.categoryId;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes
cropListingSchema.index({ farmerId: 1 }); // Supports "My Listings" farmer dashboard queries
cropListingSchema.index({ categoryId: 1 }); // Supports category filter queries
cropListingSchema.index({ status: 1 }); // Supports active/available listing queries
cropListingSchema.index({ coordinates: '2dsphere' }, { sparse: true }); // Supports geospatial distance discovery
cropListingSchema.index({ categoryId: 1, status: 1, createdAt: -1 }); // Compound: Category filter + available status + newest sort

export const CropListing: Model<CropListingDocument> = model<CropListingDocument>(
  'CropListing',
  cropListingSchema
);
export default CropListing;
