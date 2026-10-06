import { Schema, model, Document, Model } from 'mongoose';
import { User as IUser, UserRole, LanguageCode } from '@rythuconnect/types';

export interface UserDocument extends Omit<IUser, 'id'>, Document {}

const userSchema = new Schema<UserDocument>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number (10-15 digits)'],
    },
    role: {
      type: String,
      enum: {
        values: Object.values(UserRole),
        message: '{VALUE} is not a valid user role',
      },
      default: UserRole.BUYER,
      required: [true, 'User role is required'],
    },
    preferredLanguage: {
      type: String,
      enum: {
        values: Object.values(LanguageCode),
        message: '{VALUE} is not a supported language code',
      },
      default: LanguageCode.EN,
      required: [true, 'Preferred language is required'],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes
// phone unique index automatically created by unique: true
userSchema.index({ role: 1 }); // Supports filtering users by role

export const User: Model<UserDocument> = model<UserDocument>('User', userSchema);
export default User;
