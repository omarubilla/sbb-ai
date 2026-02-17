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

async function cleanupEverything() {
  console.log('🗑️  Complete cleanup of sample data...\n');
  
  // Step 1: Delete all sample orders and customers
  console.log('Deleting sample orders and customers...');
  const orders = await client.fetch(`*[_type == "order"]{_id, orderNumber}`);
  for (const order of orders) {
    await client.delete(order._id);
    console.log(`✓ Deleted order: ${order.orderNumber}`);
  }
  
  const customers = await client.fetch(`*[_type == "customer"]{_id, name}`);
  for (const customer of customers) {
    await client.delete(customer._id);
    console.log(`✓ Deleted customer: ${customer.name}`);
  }
  
  // Step 2: Delete all furniture products
  console.log('\nDeleting furniture products...');
  const furnitureProducts = await client.fetch(`*[_type == "product" && category._ref in [
    "category-sofas",
    "category-chairs", 
    "category-tables",
    "category-beds",
    "category-storage",
    "category-lighting"
  ]]{_id, name}`);
  
  for (const product of furnitureProducts) {
    await client.delete(product._id);
    console.log(`✓ Deleted product: ${product.name}`);
  }
  
  // Step 3: Delete old furniture categories
  console.log('\nDeleting furniture categories...');
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
  
  console.log('\n✅ Complete cleanup finished! Only biotech products remain.');
}

cleanupEverything().catch(console.error);
