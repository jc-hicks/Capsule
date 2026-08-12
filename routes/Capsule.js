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
  markContributionRevealed,
  resetRevealedForViewer,
  setPredictionOutcome,
  updateContribution
} from "../models/Contribution.js";

const router = express.Router();

const canAccessCapsule = (capsule, user) => {
  if (!capsule || !user) return false;
  if (capsule.owner === user.id) return true;
  const members = capsule.members || [];
  return members.includes(user.id) || members.includes(user.email);
};

// Stored media is a base64 data URL like "data:image/png;base64,iVBOR…".
// Split it back into a content type and a decoded buffer for streaming.
const parseDataUrl = (dataUrl) => {
  const match = /^data:([^;,]+)(?:;[^,]*)?,(.*)$/s.exec(dataUrl || "");
  if (!match) return null;
  return { contentType: match[1], buffer: Buffer.from(match[2], "base64") };
};

// Streams a photo/voice blob for a contribution. Access mirrors the reveal
// rules: the viewer must belong to the capsule, and the media is only served
// once the capsule is open or to the author of the contribution.
const sendContributionMedia = async (req, res, next, kind) => {
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

    const contribution = await findContributionById(req.params.contributionId);

    if (!contribution || contribution.capsuleId !== capsule.id) {
      return res.status(404).json({ error: "Contribution not found" });
    }

    const isAuthor = contribution.authorId === req.user.id;
    if (!getCapsuleOpenState(capsule).isOpen && !isAuthor) {
      return res.status(403).json({ error: "This capsule is still sealed" });
    }

    const field = kind === "photo" ? "photoDataUrl" : "audioDataUrl";
    const media = parseDataUrl(contribution[field]);
    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    res.setHeader("Content-Type", media.contentType);
    // The media never changes once it can be viewed (open capsules are locked
    // from edits), so let the browser cache it and skip re-downloading.
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(media.buffer);
  } catch (error) {
    next(error);
  }
};

const getCapsuleOpenState = (capsule) => {
  const openDate = new Date(capsule.openDate);
  const now = new Date();
  const isOpen = openDate <= now;

  const deadlineValue = capsule.submissionDeadline || capsule.openDate;
  const submissionDeadline = new Date(deadlineValue);
  const submissionsClosed = submissionDeadline <= now;

  return {
    isOpen,
    opensAt: openDate.toISOString(),
    millisecondsUntilOpen: Math.max(openDate.getTime() - now.getTime(), 0),
    submissionsClosed,
    submissionsCloseAt: submissionDeadline.toISOString(),
    millisecondsUntilClose: Math.max(
      submissionDeadline.getTime() - now.getTime(),
      0
    )
  };
};

router.get("/capsules", isAuthenticated, async (req, res, next) => {
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
      ? await findContributionsByCapsuleId(capsule.id, req.user.id)
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
      if (revealState.submissionsClosed) {
        return res.status(403).json({
          error: "Submissions for this capsule have closed"
        });
      }

      const {
        type,
        content,
        photoDataUrl,
        photoName,
        audioDataUrl,
        audioName
      } = req.body;

      if (!isContributionType(type)) {
        return res.status(400).json({ error: "Invalid contribution type" });
      }

      const trimmedContent = typeof content === "string" ? content.trim() : "";

      if (type === "photo") {
        if (!photoDataUrl) {
          return res.status(400).json({ error: "A photo file is required" });
        }
      } else if (type === "voice") {
        if (!audioDataUrl) {
          return res
            .status(400)
            .json({ error: "A voice recording is required" });
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
        audioDataUrl,
        audioName,
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

      if (getCapsuleOpenState(capsule).submissionsClosed) {
        return res.status(403).json({
          error: "Submissions for this capsule have closed"
        });
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

      const { content, photoDataUrl, photoName, audioDataUrl, audioName } =
        req.body;

      if (contribution.type === "photo") {
        if (photoDataUrl !== undefined && !photoDataUrl) {
          return res.status(400).json({ error: "A photo file is required" });
        }
      } else if (contribution.type === "voice") {
        if (audioDataUrl !== undefined && !audioDataUrl) {
          return res
            .status(400)
            .json({ error: "A voice recording is required" });
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
        photoName,
        audioDataUrl,
        audioName
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

      if (getCapsuleOpenState(capsule).submissionsClosed) {
        return res.status(403).json({
          error: "Submissions for this capsule have closed"
        });
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

router.patch(
  "/capsules/:id/contributions/:contributionId/outcome",
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

      // A prediction can only be judged once its capsule has opened and the
      // outcome is actually known.
      if (!getCapsuleOpenState(capsule).isOpen) {
        return res.status(403).json({
          error: "Predictions can only be resolved after the capsule opens"
        });
      }

      if (capsule.owner !== req.user.id) {
        return res
          .status(403)
          .json({ error: "Only the owner can resolve predictions" });
      }

      const { outcome } = req.body;
      if (![true, false, null].includes(outcome)) {
        return res
          .status(400)
          .json({ error: "Outcome must be true, false, or null" });
      }

      const contribution = await findContributionById(
        req.params.contributionId
      );

      if (!contribution || contribution.capsuleId !== capsule.id) {
        return res.status(404).json({ error: "Contribution not found" });
      }

      if (contribution.type !== "prediction") {
        return res
          .status(400)
          .json({ error: "Only predictions can be resolved" });
      }

      const updated = await setPredictionOutcome(
        req.params.contributionId,
        outcome
      );

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/capsules/:id/contributions/:contributionId/reveal",
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

      if (!getCapsuleOpenState(capsule).isOpen) {
        return res
          .status(403)
          .json({ error: "This capsule hasn't opened yet" });
      }

      const contribution = await findContributionById(
        req.params.contributionId
      );

      if (!contribution || contribution.capsuleId !== capsule.id) {
        return res.status(404).json({ error: "Contribution not found" });
      }

      const updated = await markContributionRevealed(
        req.params.contributionId,
        req.user.id
      );

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/capsules/:id/reveals",
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

      await resetRevealedForViewer(capsule.id, req.user.id);

      res.status(204).end();
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/capsules/:id/contributions/:contributionId/photo",
  isAuthenticated,
  (req, res, next) => sendContributionMedia(req, res, next, "photo")
);

router.get(
  "/capsules/:id/contributions/:contributionId/audio",
  isAuthenticated,
  (req, res, next) => sendContributionMedia(req, res, next, "audio")
);

router.post("/capsules", isAuthenticated, async (req, res, next) => {
  const { name, description, openDate, submissionDeadline } = req.body;

  if (!name || !description || !openDate || !submissionDeadline) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (new Date(submissionDeadline) > new Date(openDate)) {
    return res.status(400).json({
      error: "Submissions must close on or before the open date"
    });
  }

  try {
    const newCapsule = await createCapsule(
      { name, description, openDate, submissionDeadline },
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

    if (getCapsuleOpenState(capsule).submissionsClosed) {
      return res.status(403).json({
        error:
          "Submissions have closed and this capsule can no longer be edited"
      });
    }

    const { name, description, openDate, submissionDeadline } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (openDate !== undefined) updates.openDate = openDate;
    if (submissionDeadline !== undefined) {
      updates.submissionDeadline = submissionDeadline;
    }

    if (
      (updates.name !== undefined && !updates.name) ||
      (updates.description !== undefined && !updates.description) ||
      (updates.openDate !== undefined && !updates.openDate) ||
      (updates.submissionDeadline !== undefined && !updates.submissionDeadline)
    ) {
      return res
        .status(400)
        .json({ error: "Fields cannot be set to empty values" });
    }

    const nextOpenDate = updates.openDate ?? capsule.openDate;
    const nextDeadline =
      updates.submissionDeadline ??
      capsule.submissionDeadline ??
      capsule.openDate;

    if (new Date(nextDeadline) > new Date(nextOpenDate)) {
      return res.status(400).json({
        error: "Submissions must close on or before the open date"
      });
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
