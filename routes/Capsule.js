import express from "express";

import { isAuthenticated } from "../middleware/auth.js";
import {
  addMemberToCapsule,
  createCapsule,
  findCapsuleById,
  findCapsuleByShareCode,
  findCapsules
} from "../models/Capsule.js";
import {
  createContribution,
  findContributionsByCapsuleId,
  isContributionType
} from "../models/Contribution.js";

const router = express.Router();

const canAccessCapsule = (capsule, user) => {
  if (!capsule || !user) return false;
  if (capsule.owner === user.id) return true;
  const members = capsule.members || [];
  return members.includes(user.id) || members.includes(user.email);
};

const getCapsuleOpenState = (capsule) => {
  const openDate = new Date(capsule.openDate);
  const now = new Date();
  const isOpen = openDate <= now;

  return {
    isOpen,
    opensAt: openDate.toISOString(),
    millisecondsUntilOpen: Math.max(openDate.getTime() - now.getTime(), 0)
  };
};

router.get("/capsules", isAuthenticated, async (req, res, next) => {
  console.log("GET /api/capsules called");
  try {
    const capsules = await findCapsules(req.user.id, req.query.q);
    res.json(capsules);
  } catch (error) {
    next(error);
  }
});

router.post("/capsules/join", isAuthenticated, async (req, res, next) => {
  try {
    const capsule = await findCapsuleByShareCode(req.body.code, req.user.id);

    if (!capsule) {
      return res.status(404).json({ error: "No capsule found for that code" });
    }

    if (capsule.owner === req.user.id) {
      return res.status(400).json({ error: "You already own this capsule" });
    }

    if ((capsule.members || []).includes(req.user.id)) {
      return res
        .status(400)
        .json({ error: "You have already joined this capsule" });
    }

    const updated = await addMemberToCapsule(capsule.id, req.user.id);
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

router.get("/capsules/:id", isAuthenticated, async (req, res, next) => {
  try {
    const capsule = await findCapsuleById(req.params.id, req.user.id);

    if (!capsule) {
      return res.status(404).json({ error: "Capsule not found" });
    }

    if (!canAccessCapsule(capsule, req.user)) {
      return res
        .status(403)
        .json({ error: "You do not have access to this capsule" });
    }

    const revealState = getCapsuleOpenState(capsule);
    const contributions = revealState.isOpen
      ? await findContributionsByCapsuleId(capsule.id)
      : [];

    res.json({ capsule, revealState, contributions });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/capsules/:id/contributions",
  isAuthenticated,
  async (req, res, next) => {
    try {
      const capsule = await findCapsuleById(req.params.id);

      if (!capsule) {
        return res.status(404).json({ error: "Capsule not found" });
      }

      if (!canAccessCapsule(capsule, req.user)) {
        return res
          .status(403)
          .json({ error: "You do not have access to this capsule" });
      }

      const revealState = getCapsuleOpenState(capsule);
      if (revealState.isOpen) {
        return res.status(403).json({
          error: "This capsule is open and no longer accepting contributions"
        });
      }

      const { type, content, photoDataUrl, photoName } = req.body;

      if (!isContributionType(type)) {
        return res.status(400).json({ error: "Invalid contribution type" });
      }

      const trimmedContent = typeof content === "string" ? content.trim() : "";

      if (type === "photo") {
        if (!photoDataUrl) {
          return res.status(400).json({ error: "A photo file is required" });
        }
      } else if (!trimmedContent) {
        return res.status(400).json({ error: "Content is required" });
      }

      const contribution = await createContribution({
        capsuleId: capsule.id,
        type,
        content: trimmedContent,
        photoDataUrl,
        photoName,
        authorId: req.user.id,
        authorName: req.user.name
      });

      res.status(201).json(contribution);
    } catch (error) {
      next(error);
    }
  }
);

router.post("/capsules", isAuthenticated, async (req, res, next) => {
  console.log("POST /api/capsules called");
  const { name, description, openDate } = req.body;

  if (!name || !description || !openDate) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const newCapsule = await createCapsule(
      { name, description, openDate },
      req.user.id
    );
    res.status(201).json(newCapsule);
  } catch (error) {
    next(error);
  }
});

export default router;
