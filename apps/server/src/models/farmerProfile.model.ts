import { Schema, model, Document, Model, Types } from 'mongoose';
import { FarmerProfile as IFarmerProfile, GeoPoint } from '@rythuconnect/types';

export interface FarmerProfileDocument extends Omit<IFarmerProfile, 'id' | 'userId'>, Document {
  userId: Types.ObjectId;
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

const farmerProfileSchema = new Schema<FarmerProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true, // Strict 1:1 relationship with User
    },
    farmLocation: {
      type: String,
      required: [true, 'Farm location is required'],
      trim: true,
      minlength: [2, 'Farm location must be at least 2 characters long'],
      maxlength: [200, 'Farm location cannot exceed 200 characters'],
    },
    coordinates: {
      type: pointSchema,
      required: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.userId = ret.userId ? ret.userId.toString() : ret.userId;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes
// userId unique index created by unique: true
farmerProfileSchema.index({ coordinates: '2dsphere' }, { sparse: true }); // Supports geospatial queries for nearby farms

export const FarmerProfile: Model<FarmerProfileDocument> = model<FarmerProfileDocument>(
  'FarmerProfile',
  farmerProfileSchema
);
export default FarmerProfile;
