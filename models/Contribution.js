import { ObjectId } from "mongodb";

import { contributionsCollection } from "../config/db.js";

const allowedTypes = new Set(["message", "prediction", "photo", "voice"]);

// Photos and voice notes are stored as base64 data URLs, which are huge. List
// endpoints omit them and let the client stream each blob from its own cacheable
// media route instead, so the capsule payload stays small.
const WITHOUT_MEDIA = { photoDataUrl: 0, audioDataUrl: 0 };

const toPlain = (doc, viewerId) => {
  if (!doc) return null;
  const { revealedBy, likes, comments, ...rest } = doc;
  return {
    ...rest,
    id: doc._id.toString(),
    capsuleId: doc.capsuleId.toString(),
    authorId: doc.authorId.toString(),
    revealed: Boolean(viewerId) && (revealedBy || []).includes(viewerId),
    likeCount: (likes || []).length,
    likedByViewer: Boolean(viewerId) && (likes || []).includes(viewerId),
    // Reactions are only meaningful once a capsule is open, so a comment's
    // own author is the only one who can delete it, computed server-side
    // rather than trusting the client with the viewer's raw id.
    comments: (comments || []).map((comment) => ({
      ...comment,
      deletableByViewer: Boolean(viewerId) && comment.authorId === viewerId
    }))
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
    createdAt: new Date(),
    revealedBy: [],
    likes: [],
    comments: []
  };

  // Predictions can be resolved as correct/incorrect once the capsule opens;
  // null means it has not been judged yet.
  if (type === "prediction") {
    doc.outcome = null;
  }

  const result = await contributionsCollection().insertOne(doc);
  return toPlain({ ...doc, _id: result.insertedId });
};

export const findContributionsByCapsuleId = async (capsuleId, viewerId) => {
  if (!ObjectId.isValid(capsuleId)) {
    return [];
  }

  const contributions = await contributionsCollection()
    .find({ capsuleId: new ObjectId(capsuleId) })
    .project(WITHOUT_MEDIA)
    .sort({ createdAt: 1 })
    .toArray();

  return contributions.map((doc) => toPlain(doc, viewerId));
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
    .project(WITHOUT_MEDIA)
    .sort({ createdAt: 1 })
    .toArray();

  return contributions.map(toPlain);
};

export const findContributionById = async (id, viewerId) => {
  if (!ObjectId.isValid(id)) {
    return null;
  }

  const contribution = await contributionsCollection().findOne({
    _id: new ObjectId(id)
  });

  return toPlain(contribution, viewerId);
};

// Marks a contribution as revealed for a specific viewer — reveal progress
// is per-account, so it stays put across browsers/devices and doesn't
// depend on local storage surviving.
export const markContributionRevealed = async (id, viewerId) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid contribution id");
  }

  await contributionsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $addToSet: { revealedBy: viewerId } }
  );

  return findContributionById(id, viewerId);
};

// Clears one viewer's reveal progress across an entire capsule, for
// "start over" — everyone else's reveal state is untouched.
export const resetRevealedForViewer = async (capsuleId, viewerId) => {
  if (!ObjectId.isValid(capsuleId)) {
    return 0;
  }

  const result = await contributionsCollection().updateMany(
    { capsuleId: new ObjectId(capsuleId) },
    { $pull: { revealedBy: viewerId } }
  );

  return result.modifiedCount;
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

export const setPredictionOutcome = async (id, outcome) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid contribution id");
  }

  await contributionsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $set: { outcome, updatedAt: new Date() } }
  );

  return findContributionById(id);
};

// Toggles the viewer's like on/off. Likes only make sense once a capsule is
// open — that's enforced by the route, not here.
export const toggleContributionLike = async (id, viewerId) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid contribution id");
  }

  const existing = await contributionsCollection().findOne(
    { _id: new ObjectId(id) },
    { projection: { likes: 1 } }
  );
  if (!existing) return null;

  const alreadyLiked = (existing.likes || []).includes(viewerId);
  await contributionsCollection().updateOne(
    { _id: new ObjectId(id) },
    alreadyLiked
      ? { $pull: { likes: viewerId } }
      : { $addToSet: { likes: viewerId } }
  );

  return findContributionById(id, viewerId);
};

export const addContributionComment = async (
  id,
  { authorId, authorName, text }
) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid contribution id");
  }

  const trimmedText = typeof text === "string" ? text.trim() : "";
  if (!trimmedText) {
    throw new Error("Comment text is required");
  }

  const comment = {
    id: new ObjectId().toString(),
    authorId,
    authorName: authorName?.trim() || "Anonymous",
    text: trimmedText,
    createdAt: new Date()
  };

  await contributionsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $push: { comments: comment } }
  );

  return findContributionById(id, authorId);
};

// Only removes the comment if commentId and authorId both match, so an
// owner can't be tricked into deleting someone else's comment.
export const deleteContributionComment = async (id, commentId, authorId) => {
  if (!ObjectId.isValid(id)) {
    throw new Error("Invalid contribution id");
  }

  const result = await contributionsCollection().updateOne(
    { _id: new ObjectId(id) },
    { $pull: { comments: { id: commentId, authorId } } }
  );

  return result.modifiedCount > 0;
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
