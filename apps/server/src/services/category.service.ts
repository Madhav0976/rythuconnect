import mongoose from 'mongoose';
import { Category as ICategory } from '@rythuconnect/types';
import { Category, CategoryDocument } from '../models';

export const INITIAL_CATEGORIES = [
  {
    name: 'Vegetables',
    slug: 'vegetables',
    translations: {
      en: 'Vegetables',
      te: 'కూరగాయలు',
      hi: 'सब्जियां',
    },
    isActive: true,
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    translations: {
      en: 'Fruits',
      te: 'పండ్లు',
      hi: 'फल',
    },
    isActive: true,
  },
  {
    name: 'Grains',
    slug: 'grains',
    translations: {
      en: 'Grains',
      te: 'ధాన్యాలు',
      hi: 'अनाज',
    },
    isActive: true,
  },
  {
    name: 'Pulses',
    slug: 'pulses',
    translations: {
      en: 'Pulses',
      te: 'పప్పుధాన్యాలు',
      hi: 'दालें',
    },
    isActive: true,
  },
  {
    name: 'Spices',
    slug: 'spices',
    translations: {
      en: 'Spices',
      te: 'మసాలాలు',
      hi: 'मसाले',
    },
    isActive: true,
  },
  {
    name: 'Leafy Greens',
    slug: 'leafy-greens',
    translations: {
      en: 'Leafy Greens',
      te: 'ఆకుకూరలు',
      hi: 'हरी पत्तेदार सब्जियां',
    },
    isActive: true,
  },
  {
    name: 'Commercial Crops',
    slug: 'commercial-crops',
    translations: {
      en: 'Commercial Crops',
      te: 'వాణిజ్య పంటలు',
      hi: 'व्यावसायिक फसलें',
    },
    isActive: true,
  },
];

export class CategoryService {
  /**
   * Retrieves active categories, automatically seeding default agricultural categories if none exist.
   */
  async getActiveCategories(): Promise<ICategory[]> {
    const isDbConnected = mongoose.connection.readyState === 1;

    if (!isDbConnected) {
      // In offline / memory-fallback mode, return simulated initial categories
      return INITIAL_CATEGORIES.map((cat, idx) => ({
        id: `mock-cat-${idx + 1}`,
        name: cat.name,
        slug: cat.slug,
        translations: cat.translations,
        isActive: cat.isActive,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    const count = await Category.countDocuments();
    if (count === 0) {
      await Category.insertMany(INITIAL_CATEGORIES);
    }

    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    return categories.map((cat: CategoryDocument) => cat.toJSON() as ICategory);
  }

  /**
   * Validates if a category exists and is currently active.
   */
  async isValidActiveCategory(categoryId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(categoryId)) {
      return false;
    }

    const isDbConnected = mongoose.connection.readyState === 1;
    if (!isDbConnected) {
      return true; // permit in mock mode
    }

    const category = await Category.findById(categoryId);
    return Boolean(category && category.isActive);
  }
}

export const defaultCategoryService = new CategoryService();
