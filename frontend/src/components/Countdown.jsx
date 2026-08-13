import { useEffect, useState } from "react";
import PropTypes from "prop-types";

import "./Countdown.css";

const getRemaining = (openDate) => {
  const total = new Date(openDate).getTime() - Date.now();
  if (total <= 0) return null;
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
};

export default function Countdown({
  openDate,
  onComplete,
  label = "Countdown"
}) {
  const [remaining, setRemaining] = useState(() => getRemaining(openDate));
  const [prevOpenDate, setPrevOpenDate] = useState(openDate);
  if (openDate !== prevOpenDate) {
    setPrevOpenDate(openDate);
    setRemaining(getRemaining(openDate));
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getRemaining(openDate);
      setRemaining(next);
      if (!next && onComplete) onComplete();
    }, 1000);

    return () => clearInterval(interval);
  }, [openDate, onComplete]);

  if (!remaining) return null;

  const { days, hours, minutes, seconds } = remaining;
  const pad = (n) => String(n).padStart(2, "0");

  const units = [
    days > 0 && { value: days, name: "d" },
    { value: pad(hours), name: "h" },
    { value: pad(minutes), name: "m" },
    { value: pad(seconds), name: "s" }
  ].filter(Boolean);

  return (
    <div className="countdown">
      <span className="countdown-label">{label}</span>
      <div className="countdown-units">
        {units.map((unit) => (
          <span className="countdown-unit" key={unit.name}>
            <span className="countdown-unit-value">{unit.value}</span>
            <span className="countdown-unit-name">{unit.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

Countdown.propTypes = {
  openDate: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
  label: PropTypes.string
};
