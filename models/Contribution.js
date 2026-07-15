import { ObjectId } from "mongodb";

import { contributionsCollection } from "../config/db.js";

const allowedTypes = new Set(["message", "prediction", "photo"]);

const toPlain = (doc) => {
  if (!doc) return null;
  return {
    ...doc,
    id: doc._id.toString(),
    capsuleId: doc.capsuleId.toString(),
    authorId: doc.authorId.toString()
  };
};

export const createContribution = async ({
  capsuleId,
  type,
  content,
  photoDataUrl,
  photoName,
  authorId,
  authorName
}) => {
  if (!ObjectId.isValid(capsuleId)) {
    throw new Error("Invalid capsule id");
  }

  if (!allowedTypes.has(type)) {
    throw new Error("Invalid contribution type");
  }

  const doc = {
    capsuleId: new ObjectId(capsuleId),
    type,
    content: content?.trim() || "",
    photoDataUrl: photoDataUrl || null,
    photoName: photoName || null,
    authorId: new ObjectId(authorId),
    authorName: authorName?.trim() || "Anonymous",
    createdAt: new Date()
  };

  const result = await contributionsCollection().insertOne(doc);
  return toPlain({ ...doc, _id: result.insertedId });
};

export const findContributionsByCapsuleId = async (capsuleId) => {
  if (!ObjectId.isValid(capsuleId)) {
    return [];
  }

  const contributions = await contributionsCollection()
    .find({ capsuleId: new ObjectId(capsuleId) })
    .sort({ createdAt: 1 })
    .toArray();

  return contributions.map(toPlain);
};

export const isContributionType = (type) => allowedTypes.has(type);
