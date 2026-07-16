import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

import CapsulesList from "../components/CapsulesList.jsx";
import CapsuleForm from "../components/CapsuleForm.jsx";
import JoinCapsuleForm from "../components/JoinCapsuleForm.jsx";

import "./IndexPage.css";

export default function IndexPage() {
  const navigate = useNavigate();
  const [data, setCapsules] = useState([]);
  const [user, setUser] = useState(null);
  const [createError, setCreateError] = useState(null);

  useEffect(() => {
    fetch("/api/auth/user", { credentials: "include" })
      .then((response) => {
        if (response.status === 401) {
          navigate("/login");
          return null;
        }
        return response.json();
      })
      .then((data) => {
        if (data) setUser(data.user);
      });
  }, [navigate]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    navigate("/login");
  };

  const fetchCapsules = useCallback(() => {
    fetch("/api/capsules", { credentials: "include" })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load capsules");
        }
        return response.json();
      })
      .then((data) => setCapsules(data));
  }, []);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchCapsules();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchCapsules]);

  const handleSubmit = async (capsule) => {
    setCreateError(null);
    try {
      const response = await fetch("/api/capsules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(capsule)
      });

      const body = await response.json().catch(() => ({}));

      if (response.status === 401) {
        navigate("/login");
        return false;
      }

      if (!response.ok) {
        throw new Error(body.error || "Failed to create capsule");
      }

      setCapsules((prevCapsules) => [...prevCapsules, body]);
      return true;
    } catch (error) {
      setCreateError(error.message);
      return false;
    }
  };

  const handleJoin = async (code) => {
    const response = await fetch("/api/capsules/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({ code })
    });

    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "Failed to join capsule");
    }

    // Refresh so the newly joined capsule appears in the list.
    fetchCapsules();
    return body;
  };

  return (
    <Row className="index-page">
      <Col>
        <div className="index-header">
          <h1>Capsules</h1>
          {user && (
            <div className="index-user">
              <span className="index-user-name">Welcome, {user.name}</span>
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          )}
        </div>
        <CapsulesList capsules={data} />
        {createError && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setCreateError(null)}
          >
            {createError}
          </Alert>
        )}
        <div className="index-forms">
          <JoinCapsuleForm onJoin={handleJoin} />
          <CapsuleForm onSubmit={handleSubmit} />
        </div>
      </Col>
    </Row>
  );
}
