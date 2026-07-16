import { ObjectId } from "mongodb";
import { capsulesCollection } from "../config/db.js";
import { generateShareCode, normalizeShareCode } from "./shareCode.js";

const toPlain = (doc, viewerId) => {
  if (!doc) return null;
  const owner = doc.owner.toString();
  const locked = doc.openDate ? new Date(doc.openDate) > new Date() : false;
  const plain = {
    ...doc,
    id: doc._id.toString(),
    owner,
    locked,
  };
  if (locked) {
    delete plain.description;
  }
  if (!viewerId || viewerId !== owner) {
    delete plain.shareCode;
  }
  return plain;
};

export const createCapsule = async (capsule, ownerId) => {
  const doc = {
    name: capsule.name,
    description: capsule.description,
    openDate: capsule.openDate,
    members: capsule.members || [],
    owner: new ObjectId(ownerId),
    shareCode: generateShareCode(ownerId),
    createdAt: new Date(),
  };
  const result = await capsulesCollection().insertOne(doc);
  return toPlain({ ...doc, _id: result.insertedId }, ownerId);
};

// Returns capsules the viewer owns as well as ones they've joined as a member.
export const findCapsules = async (viewerId, query) => {
  const filter = {
    $or: [{ owner: new ObjectId(viewerId) }, { members: viewerId }],
  };
  if (query) {
    filter.name = { $regex: query, $options: "i" };
  }
  const capsules = await capsulesCollection().find(filter).toArray();
  return capsules.map((doc) => toPlain(doc, viewerId));
};

export const findCapsuleById = async (id, viewerId) => {
  if (!ObjectId.isValid(id)) return null;
  const capsule = await capsulesCollection().findOne({ _id: new ObjectId(id) });
  return toPlain(capsule, viewerId);
};

export const findCapsuleByShareCode = async (code, viewerId) => {
  const shareCode = normalizeShareCode(code);
  if (!shareCode) return null;
  const capsule = await capsulesCollection().findOne({ shareCode });
  return toPlain(capsule, viewerId);
};

export const addMemberToCapsule = async (id, userId) => {
  if (!ObjectId.isValid(id)) return null;
  await capsulesCollection().updateOne(
    { _id: new ObjectId(id) },
    { $addToSet: { members: userId } }
  );
  return findCapsuleById(id, userId);
};

// Applies the provided fields to a capsule owned by ownerId. Only the owner
// may update, and only a whitelisted set of fields can be changed.
export const updateCapsule = async (id, ownerId, updates) => {
  if (!ObjectId.isValid(id)) return null;

  const allowed = ["name", "description", "openDate"];
  const changes = {};
  for (const field of allowed) {
    if (updates[field] !== undefined) {
      changes[field] = updates[field];
    }
  }

  if (Object.keys(changes).length === 0) {
    return findCapsuleById(id, ownerId);
  }

  const result = await capsulesCollection().updateOne(
    { _id: new ObjectId(id), owner: new ObjectId(ownerId) },
    { $set: changes }
  );

  if (result.matchedCount === 0) return null;
  return findCapsuleById(id, ownerId);
};

// Deletes a capsule only if it is owned by ownerId. Returns true when a
// document was removed, false otherwise.
export const deleteCapsule = async (id, ownerId) => {
  if (!ObjectId.isValid(id)) return false;
  const result = await capsulesCollection().deleteOne({
    _id: new ObjectId(id),
    owner: new ObjectId(ownerId),
  });
  return result.deletedCount > 0;
};
