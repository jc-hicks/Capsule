import "dotenv/config";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import {
  capsulesCollection,
  closeDB,
  connectDB,
  contributionsCollection,
  usersCollection
} from "../config/db.js";
import { generateShareCode } from "../models/shareCode.js";

// A predictable account + capsules for manually testing the reveal ceremony
// and prediction resolution. Safe to re-run: it wipes and recreates the demo
// user and everything they own, without touching other seeded data.
const DEMO_EMAIL = "demo@capsule.test";
const DEMO_PASSWORD = "password123";
const DEMO_NAME = "Demo User";

// A 1x1 transparent gif so the photo contribution renders without a huge blob.
const PLACEHOLDER_PHOTO =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const daysFromNow = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const buildContribution = (capsuleId, authorId, entry) => ({
  capsuleId,
  type: entry.type,
  content: entry.content || "",
  photoDataUrl: entry.photoDataUrl || null,
  photoName: entry.photoName || null,
  audioDataUrl: null,
  audioName: null,
  authorId,
  authorName: entry.authorName || DEMO_NAME,
  createdAt: new Date(),
  // Match the app: only predictions carry a resolvable outcome, unset to start.
  ...(entry.type === "prediction" ? { outcome: null } : {})
});

const run = async () => {
  await connectDB();

  // Clear any previous demo run so the script is idempotent.
  const existing = await usersCollection().findOne({ email: DEMO_EMAIL });
  if (existing) {
    const owned = await capsulesCollection()
      .find({ owner: existing._id })
      .toArray();
    const ownedIds = owned.map((c) => c._id);
    if (ownedIds.length > 0) {
      await contributionsCollection().deleteMany({
        capsuleId: { $in: ownedIds }
      });
      await capsulesCollection().deleteMany({ _id: { $in: ownedIds } });
    }
    await usersCollection().deleteOne({ _id: existing._id });
  }

  // 1. The demo account.
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userId = new ObjectId();
  await usersCollection().insertOne({
    _id: userId,
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    passwordHash,
    createdAt: new Date()
  });

  // 2. An already-open capsule with predictions to resolve + a mix of content.
  const openId = new ObjectId();
  await capsulesCollection().insertOne({
    _id: openId,
    name: "Senior Year 2024",
    description:
      "Everything we wanted to remember from our last year together.",
    openDate: daysFromNow(-2),
    members: [],
    owner: userId,
    shareCode: generateShareCode(userId.toString()),
    createdAt: new Date()
  });

  const openEntries = [
    {
      type: "message",
      content: "Grateful for every late night in the library with you all.",
      authorName: "Priya"
    },
    {
      type: "prediction",
      content: "By 2024 at least one of us will have started a company.",
      authorName: "Marcus"
    },
    {
      type: "prediction",
      content: "We'll all still be in the same group chat.",
      authorName: "Priya"
    },
    {
      type: "prediction",
      content: "Someone will have moved to another country.",
      authorName: "Demo User"
    },
    {
      type: "photo",
      content: "The whole crew on graduation day.",
      photoDataUrl: PLACEHOLDER_PHOTO,
      photoName: "graduation.gif",
      authorName: "Marcus"
    },
    {
      type: "message",
      content: "Whatever happens next, this year meant everything.",
      authorName: "Demo User"
    }
  ];

  // 3. A still-locked capsule so the countdown + contribute flow is testable too.
  const lockedId = new ObjectId();
  await capsulesCollection().insertOne({
    _id: lockedId,
    name: "New Year 2030 Goals",
    description: "Sealed until we can see how well we predicted the future.",
    openDate: daysFromNow(120),
    members: [],
    owner: userId,
    shareCode: generateShareCode(userId.toString()),
    createdAt: new Date()
  });

  const lockedEntries = [
    {
      type: "prediction",
      content: "I'll have visited three new countries by 2030.",
      authorName: "Demo User"
    },
    {
      type: "message",
      content: "A note to my future self: slow down and enjoy it.",
      authorName: "Demo User"
    }
  ];

  const docs = [
    ...openEntries.map((e) => buildContribution(openId, userId, e)),
    ...lockedEntries.map((e) => buildContribution(lockedId, userId, e))
  ];
  await contributionsCollection().insertMany(docs);

  console.log("\nDemo data ready.\n");
  console.log("Login:");
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}\n`);
  console.log("Capsules (owned by this account):");
  console.log(
    `  OPEN   "Senior Year 2024"    -> /capsules/${openId}  (3 predictions to resolve)`
  );
  console.log(
    `  LOCKED "New Year 2030 Goals" -> /capsules/${lockedId} (opens in 120 days)`
  );
  console.log(
    "\nOpen the OPEN capsule to try the reveal ceremony and mark predictions" +
      " true/false.\n"
  );

  await closeDB();
};

run().catch(async (error) => {
  console.error("Failed to create demo data:", error.message);
  await closeDB();
  process.exit(1);
});
