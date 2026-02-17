import { MongoClient } from "mongodb";
import fs from "fs";

const uri = "mongodb+srv://migrationuser:biohub12345@cluster0.vo5iy.mongodb.net/test?retryWrites=true&w=majority";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected!");

    const db = client.db("test");
    const products = await db.collection("products").find({}).toArray();

    fs.writeFileSync("products.json", JSON.stringify(products, null, 2));
    console.log(`Exported ${products.length} products`);
  } catch (err) {
    console.error("❌", err.message);
  } finally {
    await client.close();
  }
}

run();

