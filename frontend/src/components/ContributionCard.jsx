import PropTypes from "prop-types";

import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

import "./ContributionCard.css";

const contributionTypeLabels = {
  message: "Message",
  prediction: "Prediction",
  photo: "Photo",
  voice: "Voice note"
};

export default function ContributionCard({
  contribution,
  sealed = false,
  showActions = false,
  canResolve = false,
  onEdit = undefined,
  onDelete = undefined,
  onSetOutcome = undefined
}) {
  const isPrediction = contribution.type === "prediction";
  const { outcome } = contribution;
  const mediaBase = `/api/capsules/${contribution.capsuleId}/contributions/${contribution.id}`;
  return (
    <Card className="contribution-card">
      <Card.Body>
        <div className="contribution-card-header">
          <span className="contribution-type-badge">
            {contributionTypeLabels[contribution.type]}
          </span>
          <span className="contribution-meta">
            <span
              className="contribution-author"
              title={contribution.authorName}
            >
              {contribution.authorName}
            </span>
            <span className="contribution-timestamp">
              {new Date(contribution.createdAt).toLocaleString()}
            </span>
          </span>
        </div>

        {sealed ? (
          <p className="contribution-sealed">
            Sealed until the open date. Use Edit to change it before then.
          </p>
        ) : contribution.type === "photo" ? (
          <div className="contribution-photo">
            <img
              src={`${mediaBase}/photo`}
              alt={contribution.photoName || "Capsule contribution"}
              loading="lazy"
            />
            {contribution.content && (
              <p className="contribution-text">{contribution.content}</p>
            )}
          </div>
        ) : contribution.type === "voice" ? (
          <div className="contribution-voice">
            <audio src={`${mediaBase}/audio`} controls preload="none" />
            {contribution.content && (
              <p className="contribution-text">{contribution.content}</p>
            )}
          </div>
        ) : (
          <p className="contribution-text">{contribution.content}</p>
        )}

        {!sealed && isPrediction && (
          <div className="prediction-outcome">
            {outcome === true ? (
              <span className="outcome-pill outcome-true">Came true</span>
            ) : outcome === false ? (
              <span className="outcome-pill outcome-false">
                Didn&apos;t happen
              </span>
            ) : (
              <span className="outcome-pill outcome-unresolved">
                Not yet resolved
              </span>
            )}

            {canResolve && (
              <div className="prediction-outcome-actions">
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => onSetOutcome?.(contribution, true)}
                  disabled={outcome === true}
                >
                  Came true
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => onSetOutcome?.(contribution, false)}
                  disabled={outcome === false}
                >
                  Didn&apos;t happen
                </Button>
                {(outcome === true || outcome === false) && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => onSetOutcome?.(contribution, null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {showActions && (
          <div className="contribution-actions">
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => onEdit?.(contribution)}
            >
              Edit
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={() => onDelete?.(contribution)}
            >
              Delete
            </Button>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}

ContributionCard.propTypes = {
  contribution: PropTypes.shape({
    id: PropTypes.string.isRequired,
    capsuleId: PropTypes.string.isRequired,
    type: PropTypes.oneOf(["message", "prediction", "photo", "voice"])
      .isRequired,
    authorName: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    content: PropTypes.string,
    photoName: PropTypes.string,
    audioName: PropTypes.string,
    outcome: PropTypes.bool
  }).isRequired,
  sealed: PropTypes.bool,
  showActions: PropTypes.bool,
  canResolve: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSetOutcome: PropTypes.func
};
