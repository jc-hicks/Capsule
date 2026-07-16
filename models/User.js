import { ObjectId } from "mongodb";
import { usersCollection } from "../config/db.js";

const normalizeEmail = (email) => email.trim().toLowerCase();

const toPlain = (doc) => {
  if (!doc) return null;
  return { ...doc, id: doc._id.toString() };
};

export const createUser = async (user) => {
  const doc = {
    name: user.name,
    email: normalizeEmail(user.email),
    passwordHash: user.passwordHash,
    createdAt: new Date(),
  };
  const result = await usersCollection().insertOne(doc);
  return toPlain({ ...doc, _id: result.insertedId });
};

export const findUserByEmail = async (email) => {
  const user = await usersCollection().findOne({
    email: normalizeEmail(email),
  });
  return toPlain(user);
};

export const findUserById = async (id) => {
  if (!ObjectId.isValid(id)) return null;
  const user = await usersCollection().findOne({ _id: new ObjectId(id) });
  return toPlain(user);
};

export const getAllUsers = async () => {
  const users = await usersCollection().find().toArray();
  return users.map(toPlain);
};
