import PropTypes from "prop-types";

import Card from "react-bootstrap/Card";

import "./Capsule.css";

export default function Capsule({ capsule }) {
  const members = capsule.members ?? [];

  let openLabel = null;
  let isLocked = false;
  if (capsule.openDate) {
    const openDate = new Date(capsule.openDate);
    isLocked = openDate > new Date();
    openLabel = openDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return (
    <Card className="capsule-card">
      <Card.Body>
        <Card.Title>{capsule.name}</Card.Title>
        <Card.Text className="capsule-description">
          {capsule.description}
        </Card.Text>
        {members.length > 0 && (
          <div className="capsule-members">
            {members.map((member) => (
              <span className="capsule-member" key={member}>
                {member}
              </span>
            ))}
          </div>
        )}
        {openLabel && (
          <p className="capsule-open-date">
            {isLocked ? "Opens" : "Opened"} {openLabel}
          </p>
        )}
      </Card.Body>
    </Card>
  );
}

Capsule.propTypes = {
  capsule: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string,
    members: PropTypes.arrayOf(PropTypes.string),
    openDate: PropTypes.string,
  }).isRequired,
};
