import { useState } from "react";
import PropTypes from "prop-types";

import Button from "react-bootstrap/Button";

import ContributionCard from "./ContributionCard.jsx";
import "./RevealCollage.css";

const MAX_TILT = 7;

// A deterministic pseudo-random tilt derived from the contribution's own id,
// so each card's angle is stable across re-renders without needing to stash
// random values in state (and without calling Math.random during render).
// MongoDB ids created in the same batch share a long common prefix, so this
// needs a hash with real avalanche behavior (FNV-1a) rather than a simple
// accumulator — otherwise near-identical ids collapse to near-identical tilts.
const tiltForId = (id) => {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const normalized = (hash % 1000) / 1000;
  return (normalized * 2 - 1) * MAX_TILT;
};

export default function RevealCollage({
  contributions,
  capsuleId,
  isOwner,
  onSetOutcome
}) {
  // Seeded once from each contribution's server-tracked `revealed` flag (per
  // account, not per browser), then updated optimistically on click so a tap
  // feels instant without waiting on the round trip.
  const [revealedIds, setRevealedIds] = useState(
    () => new Set(contributions.filter((c) => c.revealed).map((c) => c.id))
  );

  const reveal = async (id) => {
    if (revealedIds.has(id)) return;
    setRevealedIds((prev) => new Set(prev).add(id));
    try {
      await fetch(`/api/capsules/${capsuleId}/contributions/${id}/reveal`, {
        method: "PATCH",
        credentials: "include"
      });
    } catch {
      // The card still shows revealed for this visit even if this didn't
      // reach the server — worst case it needs opening again next time.
    }
  };

  const startOver = async () => {
    setRevealedIds(new Set());
    try {
      await fetch(`/api/capsules/${capsuleId}/reveals`, {
        method: "DELETE",
        credentials: "include"
      });
    } catch {
      // Best effort — the UI already reset for this visit either way.
    }
  };

  return (
    <div>
      {revealedIds.size > 0 && (
        <div className="reveal-collage-restart">
          <Button variant="link" size="sm" onClick={startOver}>
            Start over — re-seal everything
          </Button>
        </div>
      )}
      <div className="reveal-collage">
        {contributions.map((contribution) => {
          const isRevealed = revealedIds.has(contribution.id);
          const tilt = tiltForId(contribution.id);

          return (
            <div
              key={contribution.id}
              className={`reveal-collage-item${isRevealed ? " is-revealed" : ""}`}
              style={{ "--tilt": `${tilt}deg` }}
            >
              {isRevealed ? (
                <ContributionCard
                  contribution={contribution}
                  canResolve={isOwner}
                  onSetOutcome={onSetOutcome}
                />
              ) : (
                <button
                  type="button"
                  className="reveal-envelope"
                  onClick={() => reveal(contribution.id)}
                  aria-label="Tap to reveal this memory"
                >
                  <svg
                    width="34"
                    height="34"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="2" y="5" width="20" height="14" rx="2" />
                    <path d="m2 6.5 10 7 10-7" />
                  </svg>
                  <span className="reveal-envelope-label">Tap to reveal</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

RevealCollage.propTypes = {
  contributions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      revealed: PropTypes.bool
    })
  ).isRequired,
  capsuleId: PropTypes.string.isRequired,
  isOwner: PropTypes.bool,
  onSetOutcome: PropTypes.func
};
