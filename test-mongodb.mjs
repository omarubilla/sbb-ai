import { MongoClient } from "mongodb";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error("❌ MONGODB_URI not set in .env.local");
  process.exit(1);
}

console.log("🔗 Testing MongoDB connection...");
console.log("URI:", uri.replace(/:[^:/@]+@/, ":***@")); // Hide password

const client = new MongoClient(uri);

try {
  await client.connect();
  console.log("✅ Connected to MongoDB!");
  
  // List databases
  const admin = client.db().admin();
  const databases = await admin.listDatabases();
  console.log("\n📚 Databases:");
  databases.databases.forEach(db => console.log(`  - ${db.name}`));
  
  // List collections in 'test' database
  const db = client.db("test");
  const collections = await db.listCollections().toArray();
  console.log("\n📦 Collections in 'test':");
  collections.forEach(col => console.log(`  - ${col.name}`));
  
} catch (error) {
  console.error("❌ Connection failed:", error.message);
  process.exit(1);
} finally {
  await client.close();
}
