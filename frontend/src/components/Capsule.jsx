import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

import Countdown from "./Countdown.jsx";
import "./Capsule.css";

export default function Capsule({ capsule }) {
  const members = capsule.members ?? [];
  const isLocked = capsule.locked ?? false;

  let openLabel = null;
  if (capsule.openDate) {
    openLabel = new Date(capsule.openDate).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      // openDate is a calendar date (no time); format it in UTC so it shows
      // exactly the day that was picked instead of shifting a day in local time.
      timeZone: "UTC"
    });
  }

  return (
    <Card className="capsule-card">
      <Card.Body>
        <Card.Title>{capsule.name}</Card.Title>
        {isLocked ? (
          <Card.Text className="capsule-description capsule-sealed">
            Sealed until the open date.
          </Card.Text>
        ) : (
          <Card.Text className="capsule-description">
            {capsule.description}
          </Card.Text>
        )}
        {isLocked && capsule.openDate && (
          <Countdown openDate={capsule.openDate} />
        )}
        {capsule.shareCode && (
          <Card.Text className="capsule-share-code">
            Share code: <span>{capsule.shareCode}</span>
          </Card.Text>
        )}
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
        <Button
          as={Link}
          to={`/capsules/${capsule.id}`}
          variant="outline-primary"
          size="sm"
        >
          View capsule
        </Button>
      </Card.Body>
    </Card>
  );
}

Capsule.propTypes = {
  capsule: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string,
    description: PropTypes.string,
    members: PropTypes.arrayOf(PropTypes.string),
    openDate: PropTypes.string,
    locked: PropTypes.bool,
    shareCode: PropTypes.string
  }).isRequired
};
