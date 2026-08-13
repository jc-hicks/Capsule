import { useState } from "react";
import PropTypes from "prop-types";

import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";

import VoiceRecorder from "./VoiceRecorder.jsx";
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
  showOutcome = true,
  canResolve = false,
  isEditing = false,
  savingEdit = false,
  onEdit = undefined,
  onCancelEdit = undefined,
  onSaveEdit = undefined,
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
  const [draftContent, setDraftContent] = useState(contribution.content || "");
  const [draftPhoto, setDraftPhoto] = useState(null);
  const [draftAudio, setDraftAudio] = useState(null);
  const [recorderKey, setRecorderKey] = useState(0);
  const [wasEditing, setWasEditing] = useState(isEditing);
  const mediaBase = `/api/capsules/${contribution.capsuleId}/contributions/${contribution.id}`;

  const handleCommentSubmit = (event) => {
    event.preventDefault();
    if (!commentDraft.trim()) return;
    onAddComment?.(contribution, commentDraft.trim());
    setCommentDraft("");
  };

  if (isEditing !== wasEditing) {
    setWasEditing(isEditing);
    if (isEditing) {
      setDraftContent(contribution.content || "");
      setDraftPhoto(null);
      setDraftAudio(null);
      setRecorderKey((key) => key + 1);
    }
  }

  const submitEdit = (event) => {
    event.preventDefault();
    onSaveEdit?.(contribution, {
      content: draftContent,
      photoFile: draftPhoto,
      audioBlob: draftAudio
    });
  };

  if (isEditing) {
    return (
      <Card className="contribution-card contribution-card-editing">
        <Card.Body>
          <Form onSubmit={submitEdit}>
            <div className="contribution-card-header">
              <span className="contribution-type-badge">
                {contributionTypeLabels[contribution.type]}
              </span>
              <span className="contribution-editing-label">Editing</span>
            </div>

            {contribution.type === "photo" ? (
              <>
                <Form.Group
                  className="mb-2"
                  controlId={`replacePhoto-${contribution.id}`}
                >
                  <Form.Label>Replace photo</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    size="sm"
                    onChange={(event) =>
                      setDraftPhoto(event.target.files?.[0] || null)
                    }
                    disabled={savingEdit}
                  />
                  <Form.Text>Leave empty to keep the current photo.</Form.Text>
                </Form.Group>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  placeholder="Add a caption"
                  disabled={savingEdit}
                />
              </>
            ) : contribution.type === "voice" ? (
              <>
                <VoiceRecorder
                  key={recorderKey}
                  onRecorded={setDraftAudio}
                  existingLabel="Record again to replace your saved note."
                />
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                  placeholder="Add a caption"
                  disabled={savingEdit}
                />
              </>
            ) : (
              <Form.Control
                as="textarea"
                rows={3}
                value={draftContent}
                onChange={(event) => setDraftContent(event.target.value)}
                disabled={savingEdit}
              />
            )}

            {(comments.length > 0 || contribution.likeCount > 0) && (
              <p className="contribution-editing-note">
                {contribution.likeCount > 0 &&
                  `${contribution.likeCount} like${contribution.likeCount === 1 ? "" : "s"}`}
                {contribution.likeCount > 0 && comments.length > 0 && " · "}
                {comments.length > 0 &&
                  `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
                {" — kept while you edit."}
              </p>
            )}

            <div className="contribution-actions">
              <Button type="submit" size="sm" disabled={savingEdit}>
                {savingEdit ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline-secondary"
                size="sm"
                onClick={() => onCancelEdit?.()}
                disabled={savingEdit}
              >
                Cancel
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    );
  }

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

        {!sealed && showOutcome && isPrediction && (
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
  showOutcome: PropTypes.bool,
  canResolve: PropTypes.bool,
  isEditing: PropTypes.bool,
  savingEdit: PropTypes.bool,
  onEdit: PropTypes.func,
  onCancelEdit: PropTypes.func,
  onSaveEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onSetOutcome: PropTypes.func,
  onToggleLike: PropTypes.func,
  onAddComment: PropTypes.func,
  onDeleteComment: PropTypes.func
};
