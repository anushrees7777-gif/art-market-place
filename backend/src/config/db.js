const mongoose = require("mongoose");

// Zero-config local dev: if MONGO_URI is unset or explicitly "memory", spin up
// an in-memory MongoDB (mongodb-memory-server) so the whole stack runs with
// `npm run dev` and no separate database install/account. Set a real
// MONGO_URI (local mongod, or an Atlas connection string) in .env for
// anything you want to persist across restarts, e.g. before a demo/deploy.
async function connectDB() {
  mongoose.set("strictQuery", true);
  let uri = process.env.MONGO_URI;

  if (!uri || uri === "memory") {
    const path = require("path");
    const fs = require("fs");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    // Fixed dbPath + port so `npm run seed` and `npm run dev` -- two separate
    // node processes -- read/write the SAME data directory instead of each
    // getting its own empty, throwaway database. They must not run at the
    // same time against this path (WiredTiger locks it); run seed, let it
    // exit, then start dev.
    const dbPath = path.join(__dirname, "..", "..", ".mongo-data");
    fs.mkdirSync(dbPath, { recursive: true });
    const mem = await MongoMemoryServer.create({
      instance: { dbPath, port: 27117, dbName: "canvas_and_bid", storageEngine: "wiredTiger" },
    });
    uri = mem.getUri();
    console.log(`[db] no MONGO_URI set -> using local persisted in-memory MongoDB at ${dbPath}`);
    process.on("SIGINT", async () => {
      await mem.stop();
      process.exit(0);
    });
  }

  await mongoose.connect(uri);
  console.log(`[db] connected -> ${uri}`);
}

module.exports = connectDB;
