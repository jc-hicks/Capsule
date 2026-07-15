import { MongoClient } from "mongodb";

let client;
let db;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your .env file (see .env.example)"
    );
  }

  client = new MongoClient(uri);
  await client.connect();

  const dbName = process.env.MONGODB_DB || "capsule";
  db = client.db(dbName);

  // Enforce unique emails at the collection level.
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("capsules").createIndex({ owner: 1, openDate: 1 });
  await db
    .collection("capsules")
    .createIndex({ shareCode: 1 }, { unique: true, sparse: true });
  await db
    .collection("contributions")
    .createIndex({ capsuleId: 1, createdAt: 1 });

  console.log(`MongoDB connected: ${dbName}`);
  return db;
};

export const getDB = () => {
  if (!db) {
    throw new Error("Database not initialized. Call connectDB() first.");
  }
  return db;
};

// Convenience accessors for the two collections.
export const usersCollection = () => getDB().collection("users");
export const capsulesCollection = () => getDB().collection("capsules");
export const contributionsCollection = () =>
  getDB().collection("contributions");

export const closeDB = async () => {
  if (client) {
    await client.close();
  }
};
