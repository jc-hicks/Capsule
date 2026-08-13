import "dotenv/config";
import path from "node:path";
import compression from "compression";
import express from "express";
import passport from "./config/passport.js";
import session from "express-session";
import auth from "./routes/Auth.js";

import { connectDB } from "./config/db.js";
import capsuleRoutes from "./routes/Capsule.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Render (and most hosts) terminate HTTPS at a proxy in front of the app.
// Trusting it lets Express recognize the request as secure so the session
// cookie (secure: true in production) is actually set.
app.set("trust proxy", 1);

// Gzip text responses (the built JS/CSS bundle and JSON API payloads) —
// without this, Lighthouse's "Enable text compression" audit fails outright.
app.use(compression());

// Photos and voice notes are sent as base64 data URLs, which are far larger
// than the 100kb express default, so raise the request body limit.
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-only-insecure-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/api", capsuleRoutes);
app.use("/api/auth", auth);

const frontendDist = path.resolve("frontend/dist");

app.use("/", express.static(frontendDist));

// The client router owns these paths, so a deep link or refresh has to fall back
// to the SPA shell. Unmatched /api requests stay a JSON 404 instead of HTML.
app.get("/*splat", (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }
  res.sendFile(path.join(frontendDist, "index.html"));
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });
