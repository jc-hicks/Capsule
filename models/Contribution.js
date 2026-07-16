import { ObjectId } from "mongodb";

import { contributionsCollection } from "../config/db.js";

const allowedTypes = new Set(["message", "prediction", "photo", "voice"]);

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
  audioDataUrl,
  audioName,
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
    audioDataUrl: audioDataUrl || null,
    audioName: audioName || null,
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

export const findContributionsByAuthor = async (capsuleId, authorId) => {
  if (!ObjectId.isValid(capsuleId) || !ObjectId.isValid(authorId)) {
    return [];
  }

  const contributions = await contributionsCollection()
    .find({
      capsuleId: new ObjectId(capsuleId),
      authorId: new ObjectId(authorId)
    })
    .sort({ createdAt: 1 })
    .toArray();

  return contributions.map(toPlain);
};

export const findContributionById = async (id) => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const contribution = await contributionsCollection().findOne({
    _id: new ObjectId(id)
  });

  return toPlain(contribution);
};

export const updateContribution = async (
  id,
  { content, photoDataUrl, photoName, audioDataUrl, audioName }
) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid contribution id");
  }

  const updates = { updatedAt: new Date() };
  if (content !== undefined) {
    updates.content = content?.trim() || "";
  }
  if (photoDataUrl !== undefined) {
    updates.photoDataUrl = photoDataUrl || null;
  }
  if (photoName !== undefined) {
    updates.photoName = photoName || null;
  }
  if (audioDataUrl !== undefined) {
    updates.audioDataUrl = audioDataUrl || null;
  }
  if (audioName !== undefined) {
    updates.audioName = audioName || null;
  }

  await contributionsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $set: updates }
  );

  return findContributionById(id);
};

export const deleteContribution = async (id) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid contribution id");
  }

  const result = await contributionsCollection().deleteOne({
    _id: new ObjectId(id)
  });

  return result.deletedCount === 1;
};

export const deleteContributionsByCapsuleId = async (capsuleId) => {
  if (!ObjectId.isValid(capsuleId)) {
    return 0;
  }

  const result = await contributionsCollection().deleteMany({
    capsuleId: new ObjectId(capsuleId)
  });

  return result.deletedCount;
};

export const isContributionType = (type) => allowedTypes.has(type);
