import { useEffect, useState, useCallback } from 'react';

import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

import CapsulesList from "../components/CapsulesList.jsx";

export default function IndexPage() {
  const [data, setCapsules] = useState(null);

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

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <Row>
      <Col>
        <h1>Capsules</h1>
        <CapsulesList capsules={data} />
      </Col>
    </Row>
  );
}
