import { ObjectId } from "mongodb";
import { capsulesCollection, usersCollection } from "../config/db.js";
import { generateShareCode, normalizeShareCode } from "./shareCode.js";

// Kept in sync with frontend/src/styles/capsuleThemes.js (ids only — the
// backend doesn't need the display colors, just to validate what's stored).
export const CAPSULE_THEME_IDS = [
  "indigo",
  "rose",
  "amber",
  "sage",
  "slate",
  "plum"
];
export const DEFAULT_CAPSULE_THEME = "indigo";

// Members are stored as user ids; resolve them to display names for the client.
// Anything that isn't a known user id (e.g. a legacy email) is passed through.
const resolveMemberNames = async (members) => {
  const list = members || [];
  const objectIds = list
    .filter((member) => ObjectId.isValid(member))
    .map((member) => new ObjectId(member));

  const nameById = new Map();
  if (objectIds.length > 0) {
    const users = await usersCollection()
      .find({ _id: { $in: objectIds } })
      .toArray();
    for (const user of users) {
      nameById.set(user._id.toString(), user.name);
    }
  }

  // Drop any member whose account no longer exists rather than falling
  // back to displaying its raw id.
  return list
    .map((member) => nameById.get(member))
    .filter((name) => Boolean(name));
};

export const resolveSubmissionDeadline = (doc) =>
  doc.submissionDeadline || doc.openDate;

const toPlain = async (doc, viewerId) => {
  if (!doc) return null;
  const owner = doc.owner.toString();
  const locked = doc.openDate ? new Date(doc.openDate) > new Date() : false;
  const submissionDeadline = resolveSubmissionDeadline(doc);
  const plain = {
    ...doc,
    id: doc._id.toString(),
    owner,
    locked,
    submissionDeadline,
    submissionsClosed: submissionDeadline
      ? new Date(submissionDeadline) <= new Date()
      : false,
    memberNames: await resolveMemberNames(doc.members)
  };
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
    submissionDeadline: capsule.submissionDeadline,
    theme: CAPSULE_THEME_IDS.includes(capsule.theme)
      ? capsule.theme
      : DEFAULT_CAPSULE_THEME,
    // Opt-in "time capsule discipline" setting: once true, the owner can
    // never change the open date again (enforced in the PUT route, not
    // here, since that's where the current capsule is already loaded).
    // There's no way to turn this on later or back off — it's a one-time
    // choice made at creation.
    openDateLocked: Boolean(capsule.lockOpenDate),
    members: capsule.members || [],
    owner: new ObjectId(ownerId),
    shareCode: generateShareCode(ownerId),
    createdAt: new Date()
  };
  const result = await capsulesCollection().insertOne(doc);
  return toPlain({ ...doc, _id: result.insertedId }, ownerId);
};

// Returns capsules the viewer owns as well as ones they've joined as a member.
export const findCapsules = async (viewerId, query) => {
  const filter = {
    $or: [{ owner: new ObjectId(viewerId) }, { members: viewerId }]
  };
  if (query) {
    filter.name = { $regex: query, $options: "i" };
  }
  const capsules = await capsulesCollection().find(filter).toArray();
  return Promise.all(capsules.map((doc) => toPlain(doc, viewerId)));
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

  const allowed = [
    "name",
    "description",
    "openDate",
    "submissionDeadline",
    "theme"
  ];
  const changes = {};
  for (const field of allowed) {
    if (updates[field] === undefined) continue;
    // Silently ignore an unrecognized theme rather than erroring — it's a
    // cosmetic field, not a data-integrity one.
    if (field === "theme" && !CAPSULE_THEME_IDS.includes(updates[field])) {
      continue;
    }
    changes[field] = updates[field];
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
    owner: new ObjectId(ownerId)
  });
  return result.deletedCount > 0;
};
