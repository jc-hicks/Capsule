import express from "express";
import passport from "passport";
import bcrypt from "bcrypt";

import { isAuthenticated } from "../middleware/auth.js";
import { findUserByEmail, createUser } from "../models/User.js";

const router = express.Router();

router.post("/register", async (req, res, next) => {
  const { email, password, confirmPassword, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ email, passwordHash, name });
    delete user.passwordHash; // Remove password hash from the response

    // Log the new user straight in so registration flows into the app instead
    // of bouncing them back to a separate login step.
    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res
        .status(201)
        .json({ message: "User created successfully", user });
    });
  } catch (err) {
    // A concurrent signup can slip past the findUserByEmail check and hit the
    // unique email index; surface that as a clean 400 instead of a 500.
    if (err?.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    return next(err);
  }
});

router.get("/user", isAuthenticated, (req, res) => {
  const { passwordHash, ...user } = req.user;
  res.json({ user });
});

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res
        .status(401)
        .json({ message: info?.message || "Invalid credentials" });
    }
    req.login(user, (loginErr) => {
      if (loginErr) {
        return next(loginErr);
      }
      return res.json({ message: "Logged in successfully", user });
    });
  })(req, res, next);
});

router.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error occurred while logging out" });
    }
    res.json({ message: "Logged out successfully" });
  });
});

export default router;
