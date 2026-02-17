import { createClient } from '@sanity/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
  apiVersion: '2023-05-03',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

// Old furniture category IDs to delete
const oldCategories = [
  'category-sofas',
  'category-chairs',
  'category-tables',
  'category-beds',
  'category-storage',
  'category-lighting'
];

async function deleteOldCategories() {
  console.log('🗑️  Deleting old furniture categories...\n');
  
  for (const categoryId of oldCategories) {
    try {
      // Delete the category
      await client.delete(categoryId);
      console.log(`✓ Deleted category: ${categoryId}`);
    } catch (error) {
      console.log(`⚠️  Could not delete ${categoryId}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Cleanup complete!');
}

deleteOldCategories().catch(console.error);
