import { useEffect, useState } from "react";
import PropTypes from "prop-types";

const getRemaining = (openDate) => {
  const total = new Date(openDate).getTime() - Date.now();
  if (total <= 0) return null;
  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / 1000 / 60) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));
  return { total, days, hours, minutes, seconds };
};

export default function Countdown({ openDate, onComplete }) {
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

  return (
    <p className="capsule-countdown">
      Opens in {days > 0 && `${days}d `}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </p>
  );
}

Countdown.propTypes = {
  openDate: PropTypes.string.isRequired,
  onComplete: PropTypes.func,
};
