const mongoose = require("mongoose");
const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || "";
if (!uri) {
  console.error("No MONGO URI set in env (MONGODB_URI / MONGO_URI / DATABASE_URL).");
  process.exit(1);
}
console.log("Attempting connect to:", uri.replace(/\/\/.*?:.*?@/,'//<redacted>@'));
mongoose.connect(uri, { useNewUrlParser:true, useUnifiedTopology:true, serverSelectionTimeoutMS:10000 })
  .then(()=> { console.log("Mongo connected OK"); process.exit(0); })
  .catch(err => { console.error("Mongo connect FAILED:", err && err.message ? err.message : err); process.exit(2); });
