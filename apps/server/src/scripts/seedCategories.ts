import mongoose from 'mongoose';
import { env } from '../config/env';
import { Category } from '../models/category.model';

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
      hi: 'మసాలే',
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
      hi: 'व्याవసాయిక ఫసలే',
    },
    isActive: true,
  },
];

export async function seedCategories(): Promise<void> {
  console.log('[Seed] Connecting to MongoDB...');
  await mongoose.connect(env.MONGODB_URI);

  console.log(`[Seed] Upserting ${INITIAL_CATEGORIES.length} initial categories...`);
  for (const cat of INITIAL_CATEGORIES) {
    await Category.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, new: true }
    );
    console.log(`  ✓ Seeded category: ${cat.name} (${cat.slug})`);
  }

  console.log('[Seed] Categories seeded successfully.');
  await mongoose.disconnect();
  console.log('[Seed] Database disconnected.');
}

// Execute directly if run via CLI
if (require.main === module) {
  seedCategories()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Seed] Error seeding categories:', err);
      process.exit(1);
    });
}
