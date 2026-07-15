import "dotenv/config";
import express from "express";
import passport from "./config/passport.js";
import session from "express-session";
import auth from "./routes/Auth.js";

import { connectDB } from "./config/db.js";
import capsuleRoutes from "./routes/Capsule.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

app.use("/", express.static("frontend/dist"));

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
