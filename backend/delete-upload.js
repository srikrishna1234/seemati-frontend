// delete-upload.js
// Run with:
// $env:MONGO_URI="your-uri"; node delete-upload.js

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const MONGO = process.env.MONGO_URI;
const FILE = "1763637644196_6.png";  // the broken image
const UPLOADS_PATH = process.env.UPLOADS_PATH || "";  // optional local path

if (!MONGO) {
  console.error("❌ Please set MONGO_URI environment variable.");
  process.exit(1);
}

// Automatically extract DB name from URI
function getDbName(uri) {
  const match = uri.match(/mongodb.*\/([^/?]+)(\?|$)/);
  if (match && match[1]) return match[1];
  console.error("❌ Unable to detect DB name from URI.");
  process.exit(1);
}

const DB_NAME = getDbName(MONGO);
console.log("Using DB:", DB_NAME);

async function main() {
  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB_NAME);
  const products = db.collection("products");

  console.log("🧹 Cleaning DB references for:", FILE);

  const result = await products.updateMany(
    {
      $or: [
        { images: FILE },
        { image: FILE },
        { images: { $elemMatch: { $eq: FILE } } },
      ],
    },
    {
      $pull: { images: FILE },
      $unset: { image: "" },
    }
  );

  console.log("DB update result:", result.modifiedCount, "document(s) cleaned.");

  if (UPLOADS_PATH) {
    const filePath = path.join(UPLOADS_PATH, FILE);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log("🗑 Deleted file from filesystem:", filePath);
      } else {
        console.log("⚠ File not found on filesystem:", filePath);
      }
    } catch (err) {
      console.log("FS delete error:", err.message);
    }
  } else {
    console.log("Skipping filesystem delete (UPLOADS_PATH not set).");
  }

  await client.close();
  console.log("✅ Done!");
}

main().catch(console.error);
