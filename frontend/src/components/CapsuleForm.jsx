import { useState } from "react";
import PropTypes from "prop-types";

import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

import {
  CAPSULE_THEMES,
  DEFAULT_CAPSULE_THEME
} from "../styles/capsuleThemes.js";
import { todayInputValue } from "../utils/dates.js";
import "./CapsuleForm.css";

export default function CapsuleForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [openDate, setOpenDate] = useState("");
  const [submissionDeadline, setSubmissionDeadline] = useState("");
  const [theme, setTheme] = useState(DEFAULT_CAPSULE_THEME);
  const today = todayInputValue();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const succeeded = await onSubmit({
      name,
      description,
      openDate,
      submissionDeadline,
      theme
    });
    // Keep the entered values on screen if the create failed so the user can
    // fix and resubmit instead of losing their input.
    if (succeeded) {
      setName("");
      setDescription("");
      setOpenDate("");
      setSubmissionDeadline("");
      setTheme(DEFAULT_CAPSULE_THEME);
    }
  };

  return (
    <Form className="capsule-form" onSubmit={handleSubmit}>
      <h2>Create a capsule</h2>
      <FloatingLabel controlId="name" label="Name">
        <Form.Control
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </FloatingLabel>
      <FloatingLabel controlId="description" label="Description">
        <Form.Control
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </FloatingLabel>
      <Form.Group className="mb-3" controlId="openDate">
        <Form.Label>Open date</Form.Label>
        <Form.Control
          type="date"
          value={openDate}
          min={today}
          onChange={(e) => setOpenDate(e.target.value)}
          required
        />
      </Form.Group>
      <Form.Group className="mb-3" controlId="submissionDeadline">
        <Form.Label>Submissions close</Form.Label>
        <Form.Control
          type="date"
          value={submissionDeadline}
          min={today}
          max={openDate || undefined}
          onChange={(e) => setSubmissionDeadline(e.target.value)}
          required
        />
        <Form.Text>
          After this date the capsule is sealed — no new entries or edits — and
          the contents stay hidden until the open date.
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
              aria-pressed={theme === option.id}
              aria-label={option.label}
              title={option.label}
              onClick={() => setTheme(option.id)}
            />
          ))}
        </div>
      </Form.Group>
      <Button type="submit">Submit</Button>
    </Form>
  );
}

CapsuleForm.propTypes = {
  onSubmit: PropTypes.func.isRequired
};
