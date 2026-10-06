import { Schema, model, Document, Model, Types } from 'mongoose';
import { BuyerProfile as IBuyerProfile } from '@rythuconnect/types';

export interface BuyerProfileDocument extends Omit<IBuyerProfile, 'id' | 'userId'>, Document {
  userId: Types.ObjectId;
}

const buyerProfileSchema = new Schema<BuyerProfileDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true, // Strict 1:1 relationship with User
    },
    deliveryAddress: {
      type: String,
      required: [true, 'Delivery address is required'],
      trim: true,
      minlength: [5, 'Delivery address must be at least 5 characters long'],
      maxlength: [300, 'Delivery address cannot exceed 300 characters'],
    },
    businessName: {
      type: String,
      trim: true,
      maxlength: [100, 'Business name cannot exceed 100 characters'],
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
// userId unique index created by unique: true, ensures 1:1 user profile lookup

export const BuyerProfile: Model<BuyerProfileDocument> = model<BuyerProfileDocument>(
  'BuyerProfile',
  buyerProfileSchema
);
export default BuyerProfile;
