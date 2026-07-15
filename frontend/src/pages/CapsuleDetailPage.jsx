import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import PropTypes from "prop-types";

import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";

import "./CapsuleDetailPage.css";

const contributionTypeLabels = {
  message: "Message",
  prediction: "Prediction",
  photo: "Photo"
};

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

function ContributionCard({ contribution }) {
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

        {contribution.type === "photo" ? (
          <div className="contribution-photo">
            <img
              src={contribution.photoDataUrl}
              alt={contribution.photoName || "Capsule contribution"}
            />
            {contribution.content && (
              <p className="contribution-text">{contribution.content}</p>
            )}
          </div>
        ) : (
          <p className="contribution-text">{contribution.content}</p>
        )}
      </Card.Body>
    </Card>
  );
}

export default function CapsuleDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [capsule, setCapsule] = useState(null);
  const [revealState, setRevealState] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [now, setNow] = useState(0);
  const [type, setType] = useState("message");
  const [content, setContent] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOpenDate, setEditOpenDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

        setCapsule(data.capsule);
        setRevealState(data.revealState);
        setContributions(data.contributions || []);
        setIsOwner(Boolean(data.isOwner));
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
    if (!revealState?.isOpen && revealState?.opensAt) {
      const openAt = new Date(revealState.opensAt).getTime();
      if (now >= openAt) {
        const refreshTimeout = window.setTimeout(() => {
          void (async () => {
            try {
              const data = await loadCapsuleData(id, navigate);
              if (!data) {
                return;
              }

              setCapsule(data.capsule);
              setRevealState(data.revealState);
              setContributions(data.contributions || []);
              setIsOwner(Boolean(data.isOwner));
            } catch (refreshError) {
              setError(refreshError.message);
            }
          })();
        }, 0);

        return () => window.clearTimeout(refreshTimeout);
      }

      const delay = Math.max(openAt - now, 1000);
      const timeout = window.setTimeout(() => {
        void (async () => {
          try {
            const data = await loadCapsuleData(id, navigate);
            if (!data) {
              return;
            }

            setCapsule(data.capsule);
            setRevealState(data.revealState);
            setContributions(data.contributions || []);
            setIsOwner(Boolean(data.isOwner));
          } catch (refreshError) {
            setError(refreshError.message);
          }
        })();
      }, delay);

      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [id, navigate, now, revealState]);

  const countdownLabel = useMemo(() => {
    if (!revealState?.opensAt) return null;
    const openAt = new Date(revealState.opensAt).getTime();
    return formatCountdown(openAt - now);
  }, [now, revealState]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = { type, content };

      if (type === "photo") {
        if (!photoFile) {
          throw new Error("Choose a photo to upload.");
        }

        payload.photoDataUrl = await readFileAsDataUrl(photoFile);
        payload.photoName = photoFile.name;
      }

      const response = await fetch(`/api/capsules/${id}/contributions`, {
        method: "POST",
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

      setContributions((current) => [...current, data]);
      setContent("");
      setPhotoFile(null);
      setType("message");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
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
    setError(null);
    setIsEditing(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    setError(null);

    try {
      const response = await fetch(`/api/capsules/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          name: editName,
          description: editDescription,
          openDate: editOpenDate
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update capsule");
      }

      setCapsule(data);
      setIsEditing(false);
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setSavingEdit(false);
    }
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

  const locked = !revealState?.isOpen;

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
              <Card className="capsule-hero-card">
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
                        {locked && (
                          <Form.Text className="text-muted">
                            The description is hidden while the capsule is
                            sealed; leaving this blank keeps the current value
                            only if you re-enter it.
                          </Form.Text>
                        )}
                      </Form.Group>
                      <Form.Group className="mb-3">
                        <Form.Label>Open date</Form.Label>
                        <Form.Control
                          type="date"
                          value={editOpenDate}
                          onChange={(event) =>
                            setEditOpenDate(event.target.value)
                          }
                          disabled={savingEdit}
                        />
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
                          <Badge
                            bg={locked ? "warning" : "success"}
                            text="dark"
                          >
                            {locked ? "Locked" : "Open"}
                          </Badge>
                          <h1>{capsule.name}</h1>
                          <p className="capsule-hero-description">
                            {capsule.description}
                          </p>
                        </div>
                        <div className="capsule-hero-date">
                          <span>Opens on</span>
                          <strong>
                            {new Date(capsule.openDate).toLocaleDateString(
                              undefined,
                              {
                                year: "numeric",
                                month: "long",
                                day: "numeric"
                              }
                            )}
                          </strong>
                          {locked && <small>{countdownLabel} remaining</small>}
                        </div>
                      </div>

                      <div className="capsule-hero-note">
                        {locked
                          ? "Contributions are collected now, but the contents stay sealed until the open date."
                          : "The capsule is open. Contributions and reveal content are visible below."}
                      </div>

                      {isOwner && (
                        <div className="capsule-owner-actions">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={startEditing}
                          >
                            Edit
                          </Button>
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
                <Col xl={5}>
                  <Card className="capsule-contribution-card">
                    <Card.Body>
                      <h2>Add a contribution</h2>
                      <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>Contribution type</Form.Label>
                          <Form.Select
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                            disabled={!locked || submitting}
                          >
                            <option value="message">Message</option>
                            <option value="prediction">Prediction</option>
                            <option value="photo">Photo</option>
                          </Form.Select>
                        </Form.Group>

                        {type === "photo" ? (
                          <>
                            <Form.Group className="mb-3">
                              <Form.Label>Upload a photo</Form.Label>
                              <Form.Control
                                type="file"
                                accept="image/*"
                                onChange={(event) =>
                                  setPhotoFile(event.target.files?.[0] || null)
                                }
                                disabled={!locked || submitting}
                              />
                            </Form.Group>
                            <Form.Text className="text-muted">
                              The image is stored with the capsule so it can be
                              revealed later.
                            </Form.Text>
                          </>
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
                              disabled={!locked || submitting}
                            />
                          </Form.Group>
                        )}

                        {!locked && (
                          <Alert variant="info" className="mb-3">
                            This capsule is open, so new contributions are
                            disabled.
                          </Alert>
                        )}

                        <Button type="submit" disabled={!locked || submitting}>
                          {submitting ? "Saving…" : "Save contribution"}
                        </Button>
                      </Form>
                    </Card.Body>
                  </Card>
                </Col>

                <Col xl={7}>
                  <Card className="capsule-reveal-card">
                    <Card.Body>
                      <div className="capsule-reveal-header">
                        <h2>Reveal</h2>
                        {revealState?.isOpen ? (
                          <Badge bg="success">Ready to open</Badge>
                        ) : (
                          <Badge bg="secondary">Still sealed</Badge>
                        )}
                      </div>

                      {revealState?.isOpen ? (
                        contributions.length > 0 ? (
                          <div className="contribution-list">
                            {contributions.map((contribution) => (
                              <ContributionCard
                                key={contribution.id}
                                contribution={contribution}
                              />
                            ))}
                          </div>
                        ) : (
                          <Alert variant="light" className="mb-0">
                            No one has added a contribution yet.
                          </Alert>
                        )
                      ) : (
                        <div className="capsule-locked-state">
                          <p>
                            The contents stay hidden until the open date.
                            Invitees can still add messages, predictions, and
                            photos while the capsule is locked.
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
            </>
          ) : null}
        </div>
      </Col>
    </Row>
  );
}

ContributionCard.propTypes = {
  contribution: PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(["message", "prediction", "photo"]).isRequired,
    authorName: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    content: PropTypes.string,
    photoDataUrl: PropTypes.string,
    photoName: PropTypes.string
  }).isRequired
};
