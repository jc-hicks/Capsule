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
  onEdit = undefined,
  onDelete = undefined
}) {
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
              src={contribution.photoDataUrl}
              alt={contribution.photoName || "Capsule contribution"}
            />
            {contribution.content && (
              <p className="contribution-text">{contribution.content}</p>
            )}
          </div>
        ) : contribution.type === "voice" ? (
          <div className="contribution-voice">
            <audio src={contribution.audioDataUrl} controls />
            {contribution.content && (
              <p className="contribution-text">{contribution.content}</p>
            )}
          </div>
        ) : (
          <p className="contribution-text">{contribution.content}</p>
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
    type: PropTypes.oneOf(["message", "prediction", "photo", "voice"])
      .isRequired,
    authorName: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    content: PropTypes.string,
    photoDataUrl: PropTypes.string,
    photoName: PropTypes.string,
    audioDataUrl: PropTypes.string,
    audioName: PropTypes.string
  }).isRequired,
  sealed: PropTypes.bool,
  showActions: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func
};
