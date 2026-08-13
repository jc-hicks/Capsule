import { useState } from "react";
import PropTypes from "prop-types";

import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";

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
  onSetOutcome = undefined,
  onToggleLike = undefined,
  onAddComment = undefined,
  onDeleteComment = undefined
}) {
  const isPrediction = contribution.type === "prediction";
  const { outcome } = contribution;
  const comments = contribution.comments || [];
  const [commentDraft, setCommentDraft] = useState("");
  const mediaBase = `/api/capsules/${contribution.capsuleId}/contributions/${contribution.id}`;

  const handleCommentSubmit = (event) => {
    event.preventDefault();
    if (!commentDraft.trim()) return;
    onAddComment?.(contribution, commentDraft.trim());
    setCommentDraft("");
  };
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

        {!sealed && (
          <div className="contribution-reactions">
            <Button
              type="button"
              size="sm"
              variant={
                contribution.likedByViewer ? "primary" : "outline-secondary"
              }
              onClick={() => onToggleLike?.(contribution)}
            >
              {contribution.likedByViewer ? "Liked" : "Like"}
              {contribution.likeCount > 0 ? ` (${contribution.likeCount})` : ""}
            </Button>

            {comments.length > 0 && (
              <ul className="contribution-comment-list">
                {comments.map((comment) => (
                  <li key={comment.id} className="contribution-comment">
                    <span className="contribution-comment-author">
                      {comment.authorName}
                    </span>
                    <span className="contribution-comment-text">
                      {comment.text}
                    </span>
                    {comment.deletableByViewer && (
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="contribution-comment-delete"
                        onClick={() => onDeleteComment?.(contribution, comment)}
                      >
                        Delete
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <Form
              className="contribution-comment-form"
              onSubmit={handleCommentSubmit}
            >
              <Form.Control
                type="text"
                size="sm"
                placeholder="Add a comment"
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
                aria-label="Add a comment"
              />
              <Button type="submit" size="sm" disabled={!commentDraft.trim()}>
                Post
              </Button>
            </Form>
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
    outcome: PropTypes.bool,
    likeCount: PropTypes.number,
    likedByViewer: PropTypes.bool,
    comments: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        authorName: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
        deletableByViewer: PropTypes.bool
      })
    )
  }).isRequired,
  sealed: PropTypes.bool,
  showActions: PropTypes.bool,
  canResolve: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSetOutcome: PropTypes.func,
  onToggleLike: PropTypes.func,
  onAddComment: PropTypes.func,
  onDeleteComment: PropTypes.func
};
