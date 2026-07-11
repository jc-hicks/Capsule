import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Button from "react-bootstrap/Button";

import CapsulesList from "../components/CapsulesList.jsx";
import CapsuleForm from "../components/CapsuleForm.jsx";

import "./IndexPage.css";

export default function IndexPage() {
  const navigate = useNavigate();
  const [data, setCapsules] = useState(null);
  const [user, setUser] = useState(null);

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
      credentials: "include",
    });
    navigate("/login");
  };

  const fetchCapsules = useCallback(() => {
    fetch("/api/capsules")
      .then((response) => response.json())
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
    try {
      const response = await fetch("/api/capsules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(capsule),
      });

      if (!response.ok) {
        throw new Error("Failed to create capsule");
      }

      const newCapsule = await response.json();
      setCapsules((prevCapsules) => [...prevCapsules, newCapsule]);
    } catch (error) {
      console.error(error);
    }
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
        <CapsuleForm onSubmit={handleSubmit} />
      </Col>
    </Row>
  );
}
