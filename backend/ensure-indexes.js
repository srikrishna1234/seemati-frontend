// backend/ensure-indexes.js
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./src/models/Product.cjs');

(async ()=>{
  await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser:true, useUnifiedTopology:true });
  await Product.syncIndexes(); // or Product.createIndexes()
  console.log('Product indexes ensured.');
  await mongoose.disconnect();
})();
