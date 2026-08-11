import { useState } from "react";
import PropTypes from "prop-types";
import { Link } from "react-router-dom";

import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";

import Countdown from "./Countdown.jsx";
import "./Capsule.css";

export default function Capsule({ capsule }) {
  const members = capsule.memberNames ?? [];
  const isLocked = capsule.locked ?? false;
  // The share code is only ever included in the API response for the
  // capsule's owner, so its presence doubles as an ownership signal here.
  const isOwner = Boolean(capsule.shareCode);
  const [codeCopied, setCodeCopied] = useState(false);

  const handleCopyShareCode = async () => {
    try {
      await navigator.clipboard.writeText(capsule.shareCode);
    } catch {
      window.prompt("Copy this share code:", capsule.shareCode);
      return;
    }
    setCodeCopied(true);
    window.setTimeout(() => setCodeCopied(false), 2000);
  };

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
        <div className="capsule-card-header">
          <Card.Title>{capsule.name}</Card.Title>
          <span
            className={`capsule-role-badge ${
              isOwner ? "capsule-role-owner" : "capsule-role-member"
            }`}
          >
            {isOwner ? (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />
              </svg>
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            )}
            {isOwner ? "Owner" : "Member"}
          </span>
        </div>
        <Card.Text className="capsule-description">
          {capsule.description}
        </Card.Text>
        {capsule.shareCode && (
          <Card.Text className="capsule-share-code">
            Share code: <span>{capsule.shareCode}</span>
            <Button
              type="button"
              variant="outline-secondary"
              size="sm"
              className="capsule-share-code-copy"
              onClick={handleCopyShareCode}
              aria-label={codeCopied ? "Share code copied" : "Copy share code"}
              title={codeCopied ? "Copied!" : "Copy share code"}
            >
              {codeCopied ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </Button>
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
        {(openLabel || (isLocked && capsule.openDate)) && (
          <div className="capsule-schedule">
            {openLabel && (
              <p className="capsule-open-date">
                {isLocked ? "Opens" : "Opened"} {openLabel}
              </p>
            )}
            {isLocked && capsule.openDate && (
              <Countdown openDate={capsule.openDate} />
            )}
          </div>
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
    memberNames: PropTypes.arrayOf(PropTypes.string),
    openDate: PropTypes.string,
    submissionDeadline: PropTypes.string,
    locked: PropTypes.bool,
    shareCode: PropTypes.string
  }).isRequired
};
