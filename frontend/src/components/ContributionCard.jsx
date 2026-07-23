import PropTypes from "prop-types";

import Badge from "react-bootstrap/Badge";
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
          <Badge bg="secondary" className="contribution-type-badge">
            {contributionTypeLabels[contribution.type]}
          </Badge>
          <span className="contribution-meta">
            {contribution.authorName} ·{" "}
            {new Date(contribution.createdAt).toLocaleString()}
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
            <audio
              src={`${mediaBase}/audio`}
              controls
              preload="none"
              aria-label={`Voice note from ${contribution.authorName}`}
            />
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
              <Badge bg="success">Came true</Badge>
            ) : outcome === false ? (
              <Badge bg="danger">Didn&apos;t happen</Badge>
            ) : (
              <Badge bg="light" text="dark">
                Not yet resolved
              </Badge>
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
