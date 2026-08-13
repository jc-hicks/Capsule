import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Alert from "react-bootstrap/Alert";

import "./Register.css";

export default function Register() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, email, password, confirmPassword })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      navigate("/");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-panel">
        <div className="auth-header">
          <span className="auth-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </span>
          <h1>Capsule</h1>
          <p>Create a digital time capsule for your memories!</p>
        </div>
        <Card className="auth-card">
          <Card.Body>
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">
              Start preserving your memories today
            </p>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3" controlId="formBasicName">
                <Form.Label className="form-label">Name</Form.Label>
                <Form.Control
                  type="text"
                  name="name"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formBasicEmail">
                <Form.Label className="form-label">Email address</Form.Label>
                <Form.Control
                  type="email"
                  name="email"
                  placeholder="Enter email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formBasicPassword">
                <Form.Label className="form-label">Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3" controlId="formConfirmPassword">
                <Form.Label className="form-label">Confirm password</Form.Label>
                <Form.Control
                  type="password"
                  name="confirmPassword"
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  isInvalid={passwordsMismatch}
                  aria-describedby="confirmPasswordFeedback"
                />
                <Form.Control.Feedback
                  type="invalid"
                  id="confirmPasswordFeedback"
                >
                  Passwords do not match
                </Form.Control.Feedback>
              </Form.Group>

              <div className="auth-actions">
                <Button
                  variant="primary"
                  type="submit"
                  disabled={submitting || passwordsMismatch}
                >
                  {submitting ? "Submitting…" : "Register"}
                </Button>
              </div>

              <p className="auth-footer">
                Already have an account? <Link to="/login">Log in</Link>
              </p>
            </Form>
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
