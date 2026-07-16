import "dotenv/config";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";

import {
  capsulesCollection,
  closeDB,
  connectDB,
  contributionsCollection,
  usersCollection,
} from "../config/db.js";
import { generateShareCode } from "../models/shareCode.js";

// How much synthetic data to create. The rubric asks for at least 1,000
// records; contributions alone clear that on their own.
const USER_COUNT = 40;
const CAPSULE_COUNT = 120;
const MIN_CONTRIBUTIONS = 1000;

const FIRST_NAMES = [
  "Maya",
  "Devon",
  "Logan",
  "Ava",
  "Noah",
  "Mia",
  "Liam",
  "Zoe",
  "Ethan",
  "Isla",
  "Owen",
  "Aria",
  "Jack",
  "Nora",
  "Leo",
  "Ruby",
  "Kai",
  "Ivy",
  "Ezra",
  "Luna",
];
const LAST_NAMES = [
  "Rivera",
  "Chen",
  "Patel",
  "Nguyen",
  "Kim",
  "Garcia",
  "Okafor",
  "Silva",
  "Haddad",
  "Novak",
  "Reyes",
  "Larsen",
  "Moreau",
  "Costa",
  "Ali",
  "Weber",
];
const CAPSULE_THEMES = [
  "Class of",
  "Family Reunion",
  "Newborn Memories",
  "Road Trip",
  "Wedding Day",
  "Graduation",
  "New Year Goals",
  "Summer Camp",
  "First Apartment",
  "Team Season",
];
const MESSAGE_TEMPLATES = [
  "Remember how much this meant to all of us back then.",
  "Hope future us is proud of what we built together.",
  "Never forget the little moments that made this special.",
  "Sending love to whoever opens this someday.",
  "We laughed so hard on the day we sealed this capsule.",
  "Whatever happens next, we were here and it was good.",
];
const PREDICTION_TEMPLATES = [
  "I bet we'll all live in different cities by the time this opens.",
  "My prediction: at least one of us starts a company.",
  "Ten years from now we'll still be friends, I'm sure of it.",
  "I think technology will have completely changed how we talk.",
  "We'll look back and barely recognize who we were.",
  "Someone in this group will end up famous, calling it now.",
];
// A tiny 1x1 transparent GIF so seeded photo contributions render something.
const PLACEHOLDER_PHOTO =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Return an ISO date a random number of days before/after now.
const dateOffsetDays = (minDays, maxDays) => {
  const days = randInt(minDays, maxDays);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
};

const seed = async () => {
  await connectDB();

  console.log("Clearing existing users, capsules, and contributions…");
  await Promise.all([
    usersCollection().deleteMany({}),
    capsulesCollection().deleteMany({}),
    contributionsCollection().deleteMany({}),
  ]);

  // One shared hash keeps seeding fast; every demo user has this password.
  const passwordHash = await bcrypt.hash("password123", 10);

  const users = Array.from({ length: USER_COUNT }, (_, i) => {
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    return {
      _id: new ObjectId(),
      name,
      email: `demo${i + 1}@capsule.test`,
      passwordHash,
      createdAt: new Date(),
    };
  });
  await usersCollection().insertMany(users);

  const capsules = Array.from({ length: CAPSULE_COUNT }, (_, i) => {
    const owner = pick(users);
    const memberPool = users.filter((u) => u._id !== owner._id);
    const memberCount = randInt(0, 5);
    const members = [];
    for (let m = 0; m < memberCount; m += 1) {
      members.push(pick(memberPool)._id.toString());
    }
    // Roughly half locked (future) and half open (past) so the reveal view
    // can be demoed either way.
    const openDate =
      i % 2 === 0 ? dateOffsetDays(-800, -1) : dateOffsetDays(30, 800);
    return {
      _id: new ObjectId(),
      name: `${pick(CAPSULE_THEMES)} ${2018 + (i % 12)}`,
      description: `A shared time capsule with ${members.length} invited members.`,
      openDate,
      members: [...new Set(members)],
      owner: owner._id,
      shareCode: generateShareCode(owner._id.toString()),
      createdAt: new Date(),
    };
  });
  await capsulesCollection().insertMany(capsules);

  const contributions = [];
  const addContribution = (capsule) => {
    // Authors are the owner or one of the members.
    const memberIds = capsule.members;
    const authorId =
      memberIds.length > 0 && Math.random() < 0.6
        ? new ObjectId(pick(memberIds))
        : capsule.owner;
    const author =
      users.find((u) => u._id.toString() === authorId.toString()) || users[0];
    const type = pick(["message", "prediction", "photo"]);

    let content = "";
    let photoDataUrl = null;
    let photoName = null;
    if (type === "message") {
      content = pick(MESSAGE_TEMPLATES);
    } else if (type === "prediction") {
      content = pick(PREDICTION_TEMPLATES);
    } else {
      photoDataUrl = PLACEHOLDER_PHOTO;
      photoName = `memory-${contributions.length + 1}.gif`;
      content = Math.random() < 0.5 ? "A snapshot from that day." : "";
    }

    contributions.push({
      capsuleId: capsule._id,
      type,
      content,
      photoDataUrl,
      photoName,
      authorId: author._id,
      authorName: author.name,
      createdAt: new Date(),
    });
  };

  // Give every capsule a handful of contributions, then top up until we clear
  // the minimum.
  capsules.forEach((capsule) => {
    const count = randInt(4, 12);
    for (let c = 0; c < count; c += 1) {
      addContribution(capsule);
    }
  });
  while (contributions.length < MIN_CONTRIBUTIONS) {
    addContribution(pick(capsules));
  }

  await contributionsCollection().insertMany(contributions);

  console.log("Seed complete:");
  console.log(`  users:         ${users.length}`);
  console.log(`  capsules:      ${capsules.length}`);
  console.log(`  contributions: ${contributions.length}`);
  console.log(
    `  total records: ${users.length + capsules.length + contributions.length}`
  );
  console.log("\nEvery demo user's password is: password123");

  await closeDB();
};

seed().catch(async (error) => {
  console.error("Seed failed:", error);
  await closeDB();
  process.exit(1);
});
