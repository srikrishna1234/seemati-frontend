// backup-products.js
require('dotenv').config();
const fs = require('fs');
const mongoose = require('mongoose');
const Product = require('./src/models/Product.cjs');

async function run() {
  try {
    console.log("Connecting to Mongo...");
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

    console.log("Fetching products...");
    const products = await Product.find({}).lean();

    const folder = "./backups";
    if (!fs.existsSync(folder)) fs.mkdirSync(folder);

    const file = `${folder}/products_backup_${Date.now()}.json`;
    fs.writeFileSync(file, JSON.stringify(products, null, 2));

    console.log(`Backup saved → ${file}`);
    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

run();
