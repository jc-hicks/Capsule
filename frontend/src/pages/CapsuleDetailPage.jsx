import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Alert from "react-bootstrap/Alert";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Modal from "react-bootstrap/Modal";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";

import ContributionCard from "../components/ContributionCard.jsx";
import RevealCollage from "../components/RevealCollage.jsx";
import VoiceRecorder from "../components/VoiceRecorder.jsx";
import {
  CAPSULE_THEMES,
  DEFAULT_CAPSULE_THEME
} from "../styles/capsuleThemes.js";
import "./CapsuleDetailPage.css";

// Photo listed first: usability sessions found it's the most common
// contribution, and it was getting buried inside a type dropdown.
const contributionTypeOptions = [
  { value: "photo", label: "Photo" },
  { value: "message", label: "Message" },
  { value: "prediction", label: "Prediction" },
  { value: "voice", label: "Voice note" }
];

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () =>
      reject(new Error("Unable to read the selected file"));
    reader.readAsDataURL(file);
  });

const loadCapsuleData = async (capsuleId, navigate) => {
  const response = await fetch(`/api/capsules/${capsuleId}`, {
    credentials: "include"
  });

  if (response.status === 401) {
    navigate("/login");
    return null;
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Unable to load capsule");
  }

  return data;
};

const formatCountdown = (milliseconds) => {
  const totalSeconds = Math.max(Math.floor(milliseconds / 1000), 0);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  return `${days}d ${hours}h ${minutes}m`;
};

export default function CapsuleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [capsule, setCapsule] = useState(null);
  const [revealState, setRevealState] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [myContributions, setMyContributions] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [now, setNow] = useState(0);
  const [type, setType] = useState("photo");
  const [content, setContent] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recorderKey, setRecorderKey] = useState(0);
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOpenDate, setEditOpenDate] = useState("");
  const [editSubmissionDeadline, setEditSubmissionDeadline] = useState("");
  const [editTheme, setEditTheme] = useState(DEFAULT_CAPSULE_THEME);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revealMode, setRevealMode] = useState("intro");
  const [ceremonyIndex, setCeremonyIndex] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);
  // null = no manual choice yet, so visibility follows whether the capsule
  // is still locked. Once the user clicks Show/Hide, that choice sticks.
  const [contributionPanelOverride, setContributionPanelOverride] =
    useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const applyData = (data) => {
    setCapsule(data.capsule);
    setRevealState(data.revealState);
    setContributions(data.contributions || []);
    setMyContributions(data.myContributions || []);
    setIsOwner(Boolean(data.isOwner));
  };

  useEffect(() => {
    const initialNow = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(initialNow);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchCapsule = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await loadCapsuleData(id, navigate);
        if (!data || !isMounted) {
          return;
        }

        applyData(data);
      } catch (fetchError) {
        if (isMounted) {
          setError(fetchError.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchCapsule();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  useEffect(() => {
    if (!revealState) return undefined;

    const boundaries = [];
    if (!revealState.submissionsClosed && revealState.submissionsCloseAt) {
      boundaries.push(new Date(revealState.submissionsCloseAt).getTime());
    }
    if (!revealState.isOpen && revealState.opensAt) {
      boundaries.push(new Date(revealState.opensAt).getTime());
    }
    if (boundaries.length === 0) return undefined;

    const nextBoundary = Math.min(...boundaries);
    const runRefresh = async () => {
      try {
        const data = await loadCapsuleData(id, navigate);
        if (data) {
          applyData(data);
        }
      } catch (refreshError) {
        setError(refreshError.message);
      }
    };

    const delay = now >= nextBoundary ? 0 : Math.max(nextBoundary - now, 1000);
    const timeout = window.setTimeout(() => {
      void runRefresh();
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [id, navigate, now, revealState]);

  const countdownLabel = useMemo(() => {
    if (!revealState?.opensAt) return null;
    const openAt = new Date(revealState.opensAt).getTime();
    return formatCountdown(openAt - now);
  }, [now, revealState]);

  const locked = !revealState?.isOpen;
  const submissionsClosed = revealState?.submissionsClosed ?? !locked;
  const canContribute = !submissionsClosed;

  // Once a capsule opens, the add/edit contribution panel has nothing left
  // to do — default it to collapsed so the reveal gets the room, but respect
  // a manual Show/Hide click over that default from then on.
  const showContributionPanel = contributionPanelOverride ?? locked;

  const submissionDeadlineLabel = useMemo(() => {
    const deadline = revealState?.submissionsCloseAt;
    if (!deadline) return null;
    return new Date(deadline).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC"
    });
  }, [revealState]);

  const submissionCountdownLabel = useMemo(() => {
    if (!revealState?.submissionsCloseAt) return null;
    const closeAt = new Date(revealState.submissionsCloseAt).getTime();
    return formatCountdown(closeAt - now);
  }, [now, revealState]);

  if (isEditing && submissionsClosed) {
    setIsEditing(false);
  }

  const reloadCapsule = async () => {
    const data = await loadCapsuleData(id, navigate);
    if (data) {
      applyData(data);
    }
  };

  const resetContributionForm = () => {
    setEditingId(null);
    setType("photo");
    setContent("");
    setPhotoFile(null);
    setAudioBlob(null);
    setRecorderKey((key) => key + 1);
  };

  const audioExtension = (mimeType) => {
    if (!mimeType) return "webm";
    if (mimeType.includes("mp4")) return "m4a";
    if (mimeType.includes("ogg")) return "ogg";
    return "webm";
  };

  const handleContributionSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = { type, content };

      if (type === "photo") {
        if (photoFile) {
          payload.photoDataUrl = await readFileAsDataUrl(photoFile);
          payload.photoName = photoFile.name;
        } else if (!editingId) {
          throw new Error("Choose a photo to upload.");
        }
      } else if (type === "voice") {
        if (audioBlob) {
          payload.audioDataUrl = await readFileAsDataUrl(audioBlob);
          payload.audioName = `voice-note.${audioExtension(audioBlob.type)}`;
        } else if (!editingId) {
          throw new Error("Record a voice note first.");
        }
      }

      const url = editingId
        ? `/api/capsules/${id}/contributions/${editingId}`
        : `/api/capsules/${id}/contributions`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to save contribution");
      }

      await reloadCapsule();
      resetContributionForm();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const startEditContribution = (contribution) => {
    setEditingId(contribution.id);
    setType(contribution.type);
    setContent(contribution.content || "");
    setPhotoFile(null);
    setAudioBlob(null);
    setRecorderKey((key) => key + 1);
    setError(null);
  };

  const handleDeleteContribution = async (contribution) => {
    if (!window.confirm("Delete this contribution?")) {
      return;
    }

    setError(null);

    try {
      const response = await fetch(
        `/api/capsules/${id}/contributions/${contribution.id}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete contribution");
      }

      if (editingId === contribution.id) {
        resetContributionForm();
      }
      await reloadCapsule();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const handleSetOutcome = async (contribution, outcome) => {
    setError(null);

    try {
      const response = await fetch(
        `/api/capsules/${id}/contributions/${contribution.id}/outcome`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ outcome })
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update prediction");
      }

      await reloadCapsule();
    } catch (outcomeError) {
      setError(outcomeError.message);
    }
  };

  const handleToggleLike = async (contribution) => {
    setError(null);

    try {
      const response = await fetch(
        `/api/capsules/${id}/contributions/${contribution.id}/like`,
        {
          method: "PATCH",
          credentials: "include"
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update reaction");
      }

      await reloadCapsule();
    } catch (likeError) {
      setError(likeError.message);
    }
  };

  const handleAddComment = async (contribution, text) => {
    setError(null);

    try {
      const response = await fetch(
        `/api/capsules/${id}/contributions/${contribution.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ text })
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to add comment");
      }

      await reloadCapsule();
    } catch (commentError) {
      setError(commentError.message);
    }
  };

  const handleDeleteComment = async (contribution, comment) => {
    setError(null);

    try {
      const response = await fetch(
        `/api/capsules/${id}/contributions/${contribution.id}/comments/${comment.id}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete comment");
      }

      await reloadCapsule();
    } catch (deleteCommentError) {
      setError(deleteCommentError.message);
    }
  };

  const startEditing = () => {
    setEditName(capsule.name || "");
    setEditDescription(capsule.description || "");
    // openDate may be an ISO string; trim to the yyyy-mm-dd the date input needs.
    setEditOpenDate(
      capsule.openDate
        ? new Date(capsule.openDate).toISOString().slice(0, 10)
        : ""
    );
    setEditSubmissionDeadline(
      capsule.submissionDeadline
        ? new Date(capsule.submissionDeadline).toISOString().slice(0, 10)
        : ""
    );
    setEditTheme(capsule.theme || DEFAULT_CAPSULE_THEME);
    setError(null);
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setError(null);

    try {
      const updates = {
        name: editName,
        description: editDescription,
        openDate: editOpenDate,
        submissionDeadline: editSubmissionDeadline,
        theme: editTheme
      };

      const response = await fetch(`/api/capsules/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(updates)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update capsule");
      }

      // A capsule's locked state, countdown, and reveal contents all derive
      // from revealState, which this response doesn't include — reload the
      // full payload so an open-date edit that relocks (or unlocks) the
      // capsule is reflected immediately instead of only after a refresh.
      await reloadCapsule();
      setIsEditing(false);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const inviteLink = capsule?.shareCode
    ? `${window.location.origin}/?code=${capsule.shareCode}`
    : "";
  const inviteMessage = capsule?.shareCode
    ? `Join my capsule "${capsule.name}" on Capsule: ${inviteLink} (or enter code ${capsule.shareCode})`
    : "";

  const copyInviteField = async (field, text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy this:", text);
      return;
    }
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this capsule and all its contributions?")) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/capsules/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to delete capsule");
      }

      navigate("/");
    } catch (deleteError) {
      setError(deleteError.message);
      setDeleting(false);
    }
  };

  return (
    <Row className="capsule-detail-page justify-content-center">
      <Col lg={10} xl={9}>
        <div className="capsule-detail-shell">
          <div className="capsule-detail-breadcrumb">
            <Button as={Link} to="/" variant="link" className="ps-0">
              Back to capsules
            </Button>
          </div>

          {loading ? (
            <div className="capsule-detail-loading">
              <Spinner animation="border" />
              <span>Loading capsule…</span>
            </div>
          ) : error ? (
            <Alert variant="danger">{error}</Alert>
          ) : capsule ? (
            <>
              <Card
                className={`capsule-hero-card capsule-theme-${
                  capsule.theme || DEFAULT_CAPSULE_THEME
                }`}
              >
                <Card.Body>
                  {isEditing ? (
                    <Form onSubmit={handleUpdate} className="capsule-edit-form">
                      <Form.Group className="mb-3">
                        <Form.Label>Name</Form.Label>
                        <Form.Control
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          disabled={savingEdit}
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          value={editDescription}
                          onChange={(event) =>
                            setEditDescription(event.target.value)
                          }
                          disabled={savingEdit}
                        />
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Open date</Form.Label>
                        <Form.Control
                          type="date"
                          value={editOpenDate}
                          onChange={(event) =>
                            setEditOpenDate(event.target.value)
                          }
                          disabled={savingEdit || capsule.openDateLocked}
                        />
                        {capsule.openDateLocked && (
                          <Form.Text>
                            This capsule&apos;s open date was locked at creation
                            and can&apos;t be changed.
                          </Form.Text>
                        )}
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Submissions close</Form.Label>
                        <Form.Control
                          type="date"
                          value={editSubmissionDeadline}
                          max={editOpenDate || undefined}
                          onChange={(event) =>
                            setEditSubmissionDeadline(event.target.value)
                          }
                          disabled={savingEdit}
                        />
                        <Form.Text>
                          After this date no new entries or edits are accepted.
                        </Form.Text>
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Capsule color</Form.Label>
                        <div
                          className="capsule-theme-picker"
                          role="group"
                          aria-label="Capsule color"
                        >
                          {CAPSULE_THEMES.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className="capsule-theme-swatch"
                              style={{ backgroundColor: option.accent }}
                              aria-pressed={editTheme === option.id}
                              aria-label={option.label}
                              title={option.label}
                              onClick={() => setEditTheme(option.id)}
                              disabled={savingEdit}
                            />
                          ))}
                        </div>
                      </Form.Group>
                      <div className="capsule-edit-actions">
                        <Button type="submit" disabled={savingEdit}>
                          {savingEdit ? "Saving…" : "Save changes"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline-secondary"
                          onClick={() => setIsEditing(false)}
                          disabled={savingEdit}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Form>
                  ) : (
                    <>
                      <div className="capsule-hero-top">
                        <div>
                          <span
                            className={`capsule-status-pill capsule-status-${
                              !locked
                                ? "open"
                                : submissionsClosed
                                  ? "sealed"
                                  : "collecting"
                            }`}
                          >
                            {!locked
                              ? "Open"
                              : submissionsClosed
                                ? "Sealed"
                                : "Collecting"}
                          </span>
                          <h1>{capsule.name}</h1>
                          <p className="capsule-hero-description">
                            {capsule.description}
                          </p>
                        </div>
                        <div className="capsule-hero-date">
                          <span>{locked ? "Opens on" : "Opened on"}</span>
                          <strong>
                            {new Date(capsule.openDate).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                timeZone: "UTC"
                              }
                            )}
                          </strong>
                          {locked && <small>{countdownLabel} remaining</small>}
                          {canContribute && submissionCountdownLabel && (
                            <small className="capsule-hero-deadline">
                              Submissions close in {submissionCountdownLabel}
                            </small>
                          )}
                          {capsule.openDateLocked && (
                            <small className="capsule-hero-date-locked">
                              Open date locked
                            </small>
                          )}
                        </div>
                      </div>

                      <div className="capsule-hero-note">
                        {!locked
                          ? "The capsule is open. Contributions and reveal content are visible below."
                          : submissionsClosed
                            ? "Submissions have closed. Everything inside is sealed until the open date."
                            : `Contributions are open until ${submissionDeadlineLabel}, then sealed until the open date.`}
                      </div>

                      {isOwner && capsule.shareCode && (
                        <div className="capsule-invite">
                          <div className="capsule-invite-label">
                            Share this code to invite someone
                          </div>
                          <div className="capsule-invite-row">
                            <code className="capsule-invite-code">
                              {capsule.shareCode}
                            </code>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => setShowInviteModal(true)}
                            >
                              Share invite
                            </Button>
                          </div>
                          <p className="capsule-invite-validity">
                            This code works {locked ? "now and " : ""}any time
                            after the capsule opens too — it doesn&apos;t
                            expire.
                          </p>
                        </div>
                      )}

                      {isOwner && (
                        <div className="capsule-owner-actions">
                          {canContribute && (
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={startEditing}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={handleDelete}
                            disabled={deleting}
                          >
                            {deleting ? "Deleting…" : "Delete"}
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </Card.Body>
              </Card>

              <Row className="g-4 capsule-detail-grid">
                <Col xl={showContributionPanel ? 5 : "auto"}>
                  {!locked && (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="capsule-contribution-panel-toggle"
                      onClick={() =>
                        setContributionPanelOverride(!showContributionPanel)
                      }
                    >
                      {showContributionPanel
                        ? "Hide your contributions"
                        : "Show your contributions"}
                    </Button>
                  )}
                  {showContributionPanel && (
                    <>
                      <Card className="capsule-contribution-card">
                        <Card.Body>
                          <h2>
                            {editingId
                              ? "Edit your contribution"
                              : "Add a contribution"}
                          </h2>
                          <Form onSubmit={handleContributionSubmit}>
                            <Form.Group className="mb-3">
                              <Form.Label>Contribution type</Form.Label>
                              <div
                                className="contribution-type-picker"
                                role="group"
                                aria-label="Contribution type"
                              >
                                {contributionTypeOptions.map((option) => (
                                  <Button
                                    key={option.value}
                                    type="button"
                                    variant={
                                      type === option.value
                                        ? "primary"
                                        : "outline-secondary"
                                    }
                                    onClick={() => setType(option.value)}
                                    disabled={
                                      !canContribute ||
                                      submitting ||
                                      Boolean(editingId)
                                    }
                                  >
                                    {option.label}
                                  </Button>
                                ))}
                              </div>
                            </Form.Group>

                            {type === "photo" ? (
                              <>
                                <Form.Group className="mb-3">
                                  <Form.Label>Upload a photo</Form.Label>
                                  <Form.Control
                                    type="file"
                                    accept="image/*"
                                    onChange={(event) =>
                                      setPhotoFile(
                                        event.target.files?.[0] || null
                                      )
                                    }
                                    disabled={!canContribute || submitting}
                                  />
                                </Form.Group>
                                <Form.Text className="text-muted">
                                  {editingId
                                    ? "Leave this empty to keep the current photo, or choose a new one to replace it."
                                    : "The image is stored with the capsule so it can be revealed later."}
                                </Form.Text>
                              </>
                            ) : type === "voice" ? (
                              <Form.Group className="mb-3">
                                <Form.Label>Record a voice note</Form.Label>
                                <VoiceRecorder
                                  key={recorderKey}
                                  onRecorded={setAudioBlob}
                                  existingLabel={
                                    editingId
                                      ? "Record again to replace your saved note."
                                      : ""
                                  }
                                />
                              </Form.Group>
                            ) : (
                              <Form.Group className="mb-3">
                                <Form.Label>
                                  {type === "prediction"
                                    ? "Your prediction"
                                    : "Your message"}
                                </Form.Label>
                                <Form.Control
                                  as="textarea"
                                  rows={5}
                                  value={content}
                                  onChange={(event) =>
                                    setContent(event.target.value)
                                  }
                                  placeholder={
                                    type === "prediction"
                                      ? "I think we'll all be living in..."
                                      : "Write a note for the future."
                                  }
                                  disabled={!canContribute || submitting}
                                />
                              </Form.Group>
                            )}

                            {submissionsClosed && (
                              <Alert variant="info" className="mb-3">
                                {locked
                                  ? "Submissions have closed. This capsule is sealed until the open date."
                                  : "This capsule is open, so contributions can no longer be added or edited."}
                              </Alert>
                            )}

                            <div className="capsule-edit-actions">
                              <Button
                                type="submit"
                                disabled={!canContribute || submitting}
                              >
                                {submitting
                                  ? "Saving…"
                                  : editingId
                                    ? "Update contribution"
                                    : "Save contribution"}
                              </Button>
                              {editingId && (
                                <Button
                                  type="button"
                                  variant="outline-secondary"
                                  onClick={resetContributionForm}
                                  disabled={submitting}
                                >
                                  Cancel
                                </Button>
                              )}
                            </div>
                          </Form>
                        </Card.Body>
                      </Card>

                      {myContributions.length > 0 && (
                        <Card className="capsule-contribution-card capsule-your-contributions">
                          <Card.Body>
                            <h2>Your contributions</h2>
                            {locked && (
                              <p className="text-muted">
                                {canContribute
                                  ? "Your entries stay sealed until the open date. You can edit or delete them until submissions close."
                                  : "Submissions have closed, so these entries are locked in until the open date."}
                              </p>
                            )}
                            <div className="contribution-list">
                              {myContributions.map((contribution) => (
                                <ContributionCard
                                  key={contribution.id}
                                  contribution={contribution}
                                  sealed={locked}
                                  showActions={canContribute}
                                  onEdit={startEditContribution}
                                  onDelete={handleDeleteContribution}
                                  onToggleLike={handleToggleLike}
                                  onAddComment={handleAddComment}
                                  onDeleteComment={handleDeleteComment}
                                />
                              ))}
                            </div>
                          </Card.Body>
                        </Card>
                      )}
                    </>
                  )}
                </Col>

                <Col xl={showContributionPanel ? 7 : true}>
                  <Card className="capsule-reveal-card">
                    <Card.Body>
                      <div className="capsule-reveal-header">
                        <h2>Reveal</h2>
                        <span
                          className={`capsule-status-pill capsule-status-${
                            !locked
                              ? "open"
                              : submissionsClosed
                                ? "sealed"
                                : "collecting"
                          }`}
                        >
                          {!locked
                            ? "Open"
                            : submissionsClosed
                              ? "Sealed"
                              : "Collecting"}
                        </span>
                      </div>
                      <p className="capsule-reveal-note">
                        Only the capsule owner can mark predictions as true or
                        false, and only after the capsule opens.
                      </p>

                      {revealState?.isOpen ? (
                        contributions.length > 0 ? (
                          revealMode === "intro" ? (
                            <div className="reveal-intro">
                              <p className="reveal-intro-lead">
                                {contributions.length}{" "}
                                {contributions.length === 1
                                  ? "memory is"
                                  : "memories are"}{" "}
                                waiting inside. Open them one at a time?
                              </p>
                              <div className="reveal-intro-actions">
                                <Button
                                  onClick={() => {
                                    setCeremonyIndex(0);
                                    setRevealMode("ceremony");
                                  }}
                                >
                                  Begin the reveal
                                </Button>
                                <Button
                                  variant="link"
                                  onClick={() => setRevealMode("all")}
                                >
                                  View as a collage
                                </Button>
                              </div>
                            </div>
                          ) : revealMode === "ceremony" &&
                            ceremonyIndex < contributions.length ? (
                            <div className="reveal-ceremony">
                              <div className="reveal-progress">
                                {ceremonyIndex + 1} of {contributions.length}
                              </div>
                              <div
                                className="reveal-stage"
                                key={contributions[ceremonyIndex].id}
                              >
                                <ContributionCard
                                  contribution={contributions[ceremonyIndex]}
                                  canResolve={isOwner}
                                  onSetOutcome={handleSetOutcome}
                                  onToggleLike={handleToggleLike}
                                  onAddComment={handleAddComment}
                                  onDeleteComment={handleDeleteComment}
                                />
                              </div>
                              <div className="reveal-ceremony-actions">
                                <Button
                                  variant="outline-secondary"
                                  disabled={ceremonyIndex === 0}
                                  onClick={() =>
                                    setCeremonyIndex((index) =>
                                      Math.max(index - 1, 0)
                                    )
                                  }
                                >
                                  Back
                                </Button>
                                <Button
                                  onClick={() =>
                                    setCeremonyIndex((index) => index + 1)
                                  }
                                >
                                  {ceremonyIndex + 1 === contributions.length
                                    ? "Finish"
                                    : "Next"}
                                </Button>
                              </div>
                            </div>
                          ) : revealMode === "ceremony" ? (
                            <div className="reveal-complete">
                              <p className="reveal-complete-lead">
                                That&apos;s everything. 🎉
                              </p>
                              <Button onClick={() => setRevealMode("all")}>
                                View as a collage
                              </Button>
                            </div>
                          ) : (
                            <RevealCollage
                              contributions={contributions}
                              capsuleId={id}
                              isOwner={isOwner}
                              onSetOutcome={handleSetOutcome}
                              onToggleLike={handleToggleLike}
                              onAddComment={handleAddComment}
                              onDeleteComment={handleDeleteComment}
                            />
                          )
                        ) : (
                          <Alert variant="light" className="mb-0">
                            No one has added a contribution yet.
                          </Alert>
                        )
                      ) : (
                        <div className="capsule-locked-state">
                          <p>
                            {canContribute
                              ? "The contents stay hidden until the open date. Invitees can still add messages, predictions, and photos until submissions close."
                              : "Submissions have closed and everything inside is sealed until the open date."}
                          </p>
                          <p className="capsule-locked-countdown">
                            Opens in {countdownLabel}
                          </p>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              <Modal
                show={showInviteModal}
                onHide={() => setShowInviteModal(false)}
                centered
              >
                <Modal.Header closeButton>
                  <Modal.Title>
                    Invite someone to &quot;{capsule.name}&quot;
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <p className="invite-modal-hint">
                    Copy this and send it however you&apos;d like — text, email,
                    whatever&apos;s easiest. This code doesn&apos;t expire, so
                    it&apos;ll still work even after the capsule opens.
                  </p>
                  <p className="invite-modal-message">{inviteMessage}</p>
                  <Button
                    className="mb-3"
                    onClick={() => copyInviteField("message", inviteMessage)}
                  >
                    {copiedField === "message" ? "Copied!" : "Copy message"}
                  </Button>

                  <div className="invite-modal-field">
                    <div>
                      <div className="invite-modal-field-label">Link only</div>
                      <code>{inviteLink}</code>
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => copyInviteField("link", inviteLink)}
                    >
                      {copiedField === "link" ? "Copied!" : "Copy link"}
                    </Button>
                  </div>

                  <div className="invite-modal-field">
                    <div>
                      <div className="invite-modal-field-label">Code only</div>
                      <code>{capsule.shareCode}</code>
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => copyInviteField("code", capsule.shareCode)}
                    >
                      {copiedField === "code" ? "Copied!" : "Copy code"}
                    </Button>
                  </div>
                </Modal.Body>
              </Modal>
            </>
          ) : null}
        </div>
      </Col>
    </Row>
  );
}
