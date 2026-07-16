import express from "express";

import { isAuthenticated } from "../middleware/auth.js";
import {
  addMemberToCapsule,
  createCapsule,
  deleteCapsule,
  findCapsuleById,
  findCapsuleByShareCode,
  findCapsules,
  updateCapsule
} from "../models/Capsule.js";
import {
  createContribution,
  deleteContribution,
  deleteContributionsByCapsuleId,
  findContributionById,
  findContributionsByAuthor,
  findContributionsByCapsuleId,
  isContributionType,
  updateContribution
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
    // Authors can always see (and manage) their own contributions, even while
    // the capsule is still sealed, so they can edit or remove them before the
    // open date locks everything in.
    const myContributions = await findContributionsByAuthor(
      capsule.id,
      req.user.id
    );
    const isOwner = capsule.owner === req.user.id;

    res.json({
      capsule,
      revealState,
      contributions,
      myContributions,
      isOwner
    });
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

router.put(
  "/capsules/:id/contributions/:contributionId",
  isAuthenticated,
  async (req, res, next) => {
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

      if (getCapsuleOpenState(capsule).isOpen) {
        return res
          .status(403)
          .json({ error: "This capsule is open and can no longer be edited" });
      }

      const contribution = await findContributionById(
        req.params.contributionId
      );

      if (!contribution || contribution.capsuleId !== capsule.id) {
        return res.status(404).json({ error: "Contribution not found" });
      }

      if (contribution.authorId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You can only edit your own contributions" });
      }

      const { content, photoDataUrl, photoName } = req.body;

      if (contribution.type === "photo") {
        if (photoDataUrl !== undefined && !photoDataUrl) {
          return res.status(400).json({ error: "A photo file is required" });
        }
      } else if (
        content !== undefined &&
        (typeof content !== "string" || !content.trim())
      ) {
        return res.status(400).json({ error: "Content is required" });
      }

      const updated = await updateContribution(req.params.contributionId, {
        content,
        photoDataUrl,
        photoName
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/capsules/:id/contributions/:contributionId",
  isAuthenticated,
  async (req, res, next) => {
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

      if (getCapsuleOpenState(capsule).isOpen) {
        return res
          .status(403)
          .json({ error: "This capsule is open and can no longer be edited" });
      }

      const contribution = await findContributionById(
        req.params.contributionId
      );

      if (!contribution || contribution.capsuleId !== capsule.id) {
        return res.status(404).json({ error: "Contribution not found" });
      }

      if (contribution.authorId !== req.user.id) {
        return res
          .status(403)
          .json({ error: "You can only delete your own contributions" });
      }

      await deleteContribution(req.params.contributionId);

      res.status(204).end();
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

router.put("/capsules/:id", isAuthenticated, async (req, res, next) => {
  try {
    const capsule = await findCapsuleById(req.params.id, req.user.id);

    if (!capsule) {
      return res.status(404).json({ error: "Capsule not found" });
    }

    if (capsule.owner !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can update this capsule" });
    }

    const { name, description, openDate } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (openDate !== undefined) updates.openDate = openDate;

    if (
      (updates.name !== undefined && !updates.name) ||
      (updates.description !== undefined && !updates.description) ||
      (updates.openDate !== undefined && !updates.openDate)
    ) {
      return res
        .status(400)
        .json({ error: "Fields cannot be set to empty values" });
    }

    const updated = await updateCapsule(req.params.id, req.user.id, updates);

    if (!updated) {
      return res.status(404).json({ error: "Capsule not found" });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/capsules/:id", isAuthenticated, async (req, res, next) => {
  try {
    const capsule = await findCapsuleById(req.params.id, req.user.id);

    if (!capsule) {
      return res.status(404).json({ error: "Capsule not found" });
    }

    if (capsule.owner !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Only the owner can delete this capsule" });
    }

    const deleted = await deleteCapsule(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: "Capsule not found" });
    }

    await deleteContributionsByCapsuleId(req.params.id);

    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
