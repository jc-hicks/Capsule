import { useState } from "react";
import PropTypes from "prop-types";

import FloatingLabel from "react-bootstrap/FloatingLabel";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";

import "./CapsuleForm.css";

export default function CapsuleForm({ onSubmit }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [openDate, setOpenDate] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSubmit({ name, description, openDate });
    setName("");
    setDescription("");
    setOpenDate("");
  };

  return (
    <Form className="capsule-form" onSubmit={handleSubmit}>
      <h3>Create a capsule</h3>
      <FloatingLabel controlId="name" label="Name">
        <Form.Control
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel controlId="description" label="Description">
        <Form.Control
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </FloatingLabel>
      <Form.Group className="mb-3" controlId="openDate">
        <Form.Label>Open date</Form.Label>
        <Form.Control
          type="date"
          value={openDate}
          onChange={(e) => setOpenDate(e.target.value)}
        />
      </Form.Group>
      <Button type="submit">Submit</Button>
    </Form>
  );
}

CapsuleForm.propTypes = {
  onSubmit: PropTypes.func.isRequired
};
