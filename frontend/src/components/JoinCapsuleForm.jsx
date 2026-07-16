import { useState } from "react";
import PropTypes from "prop-types";

import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

import "./CapsuleForm.css";

export default function JoinCapsuleForm({ onJoin }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setStatus("");

    try {
      const capsule = await onJoin(code.trim());
      setStatus(`Joined "${capsule.name}".`);
      setCode("");
    } catch (joinError) {
      setError(joinError.message);
    }
  };

  return (
    <Form className="capsule-form" onSubmit={handleSubmit}>
      <h3>Join a capsule</h3>
      <FloatingLabel controlId="shareCode" label="Share code">
        <Form.Control
          type="text"
          placeholder="Share code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </FloatingLabel>
      {error && <p className="join-capsule-error">{error}</p>}
      {status && <p className="join-capsule-status">{status}</p>}
      <Button type="submit" disabled={!code.trim()}>
        Join
      </Button>
    </Form>
  );
}

JoinCapsuleForm.propTypes = {
  onJoin: PropTypes.func.isRequired,
};
