import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Alert from "react-bootstrap/Alert";

import CapsulesList from "../components/CapsulesList.jsx";
import CapsuleForm from "../components/CapsuleForm.jsx";
import JoinCapsuleForm from "../components/JoinCapsuleForm.jsx";

import "./IndexPage.css";

export default function IndexPage() {
  const navigate = useNavigate();
  const [data, setCapsules] = useState([]);
  const [createError, setCreateError] = useState(null);

  // Lets an invite link like "/?code=ABCD1234" (from the copy-invite button
  // on a capsule's detail page) land here with the share code pre-filled.
  const [initialCode] = useState(
    () => new URLSearchParams(window.location.search).get("code") || ""
  );

  useEffect(() => {
    if (initialCode) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [initialCode]);

  const fetchCapsules = useCallback(() => {
    fetch("/api/capsules", { credentials: "include" })
      .then((response) => {
        if (response.status === 401) {
          navigate("/login");
          return null;
        }
        if (!response.ok) {
          throw new Error("Failed to load capsules");
        }
        return response.json();
      })
      .then((data) => {
        if (data) setCapsules(data);
      });
  }, [navigate]);

  useEffect(() => {
    fetchCapsules();
  }, [fetchCapsules]);

  useEffect(() => {
    let interval = null;

    const start = () => {
      if (interval === null) {
        interval = setInterval(fetchCapsules, 5000);
      }
    };

    const stop = () => {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        fetchCapsules();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
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
          <JoinCapsuleForm onJoin={handleJoin} initialCode={initialCode} />
          <CapsuleForm onSubmit={handleSubmit} />
        </div>
      </Col>
    </Row>
  );
}
