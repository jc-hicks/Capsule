import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Spinner from "react-bootstrap/Spinner";

import ContributionCard from "../components/ContributionCard.jsx";
import "./CapsuleDetailPage.css";

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
  const [type, setType] = useState("message");
  const [content, setContent] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOpenDate, setEditOpenDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
    if (!revealState?.isOpen && revealState?.opensAt) {
      const openAt = new Date(revealState.opensAt).getTime();
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

      const delay = now >= openAt ? 0 : Math.max(openAt - now, 1000);
      const timeout = window.setTimeout(() => {
        void runRefresh();
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

  const locked = !revealState?.isOpen;

  const reloadCapsule = async () => {
    const data = await loadCapsuleData(id, navigate);
    if (data) {
      applyData(data);
    }
  };

  const resetContributionForm = () => {
    setEditingId(null);
    setType("message");
    setContent("");
    setPhotoFile(null);
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
                                day: "numeric",
                                timeZone: "UTC"
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
                      <h2>
                        {editingId
                          ? "Edit your contribution"
                          : "Add a contribution"}
                      </h2>
                      <Form onSubmit={handleContributionSubmit}>
                        <Form.Group className="mb-3">
                          <Form.Label>Contribution type</Form.Label>
                          <Form.Select
                            value={type}
                            onChange={(event) => setType(event.target.value)}
                            disabled={
                              !locked || submitting || Boolean(editingId)
                            }
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
                              {editingId
                                ? "Leave this empty to keep the current photo, or choose a new one to replace it."
                                : "The image is stored with the capsule so it can be revealed later."}
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
                            This capsule is open, so contributions can no longer
                            be added or edited.
                          </Alert>
                        )}

                        <div className="capsule-edit-actions">
                          <Button
                            type="submit"
                            disabled={!locked || submitting}
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
                            Your entries stay sealed until the open date. You
                            can edit or delete them until then.
                          </p>
                        )}
                        <div className="contribution-list">
                          {myContributions.map((contribution) => (
                            <ContributionCard
                              key={contribution.id}
                              contribution={contribution}
                              sealed={locked}
                              showActions={locked}
                              onEdit={startEditContribution}
                              onDelete={handleDeleteContribution}
                            />
                          ))}
                        </div>
                      </Card.Body>
                    </Card>
                  )}
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
