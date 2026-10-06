import { Schema, model, Document, Model } from 'mongoose';
import { Category as ICategory } from '@rythuconnect/types';

export interface CategoryDocument extends Omit<ICategory, 'id'>, Document {}

const categorySchema = new Schema<CategoryDocument>(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters long'],
      maxlength: [50, 'Category name cannot exceed 50 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Category slug is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be URL-safe kebab-case string'],
    },
    translations: {
      type: Map,
      of: String,
      default: {},
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_, ret: Record<string, any>) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        // Convert Map to plain object for JSON response if applicable
        if (ret.translations instanceof Map) {
          ret.translations = Object.fromEntries(ret.translations);
        }
        delete ret._id;
        return ret;
      },
    },
  }
);

// Indexes
// slug: unique index created by unique: true, supports slug-based URL lookups
categorySchema.index({ isActive: 1 }); // Supports filtering active categories for marketplace display

export const Category: Model<CategoryDocument> = model<CategoryDocument>('Category', categorySchema);
export default Category;
