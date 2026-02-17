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

async function cleanupFurniture() {
  console.log('🗑️  Cleaning up old furniture data...\n');
  
  // Step 1: Get all furniture products
  const furnitureProducts = await client.fetch(`*[_type == "product" && category._ref in [
    "category-sofas",
    "category-chairs", 
    "category-tables",
    "category-beds",
    "category-storage",
    "category-lighting"
  ]]{_id, name}`);
  
  console.log(`Found ${furnitureProducts.length} furniture products to delete\n`);
  
  // Step 2: Delete all furniture products
  for (const product of furnitureProducts) {
    try {
      await client.delete(product._id);
      console.log(`✓ Deleted product: ${product.name}`);
    } catch (error) {
      console.log(`⚠️  Could not delete ${product.name}: ${error.message}`);
    }
  }
  
  console.log('\n🗑️  Now deleting old categories...\n');
  
  // Step 3: Delete old furniture categories
  const oldCategories = [
    'category-sofas',
    'category-chairs',
    'category-tables',
    'category-beds',
    'category-storage',
    'category-lighting'
  ];
  
  for (const categoryId of oldCategories) {
    try {
      await client.delete(categoryId);
      console.log(`✓ Deleted category: ${categoryId}`);
    } catch (error) {
      console.log(`⚠️  Could not delete ${categoryId}: ${error.message}`);
    }
  }
  
  console.log('\n✅ Cleanup complete!');
}

cleanupFurniture().catch(console.error);
