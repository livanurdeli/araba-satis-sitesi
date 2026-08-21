import { useState, useEffect } from 'react';
import { Timer } from 'lucide-react';

export default function CountdownTimer({ endTime, onEnd }) {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    const difference = new Date(endTime) - new Date();
    if (difference <= 0) {
      return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, isEnded: true };
    }

    return {
      total: difference,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isEnded: false,
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft();
      setTimeLeft(remaining);
      if (remaining.isEnded) {
        clearInterval(timer);
        if (onEnd) onEnd();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.isEnded) {
    return (
      <span className="badge badge-ended">
        Bitti
      </span>
    );
  }

  const isUrgent = timeLeft.total < 1000 * 60 * 60; // 1 saatten az

  return (
    <span
      className="badge"
      style={{
        background: isUrgent ? '#fef2f2' : '#ffffff',
        color: isUrgent ? '#dc2626' : 'var(--text-main)',
        border: `1px solid ${isUrgent ? '#fecaca' : 'var(--border-subtle)'}`,
        fontFamily: 'var(--font-mono)',
        fontWeight: 700,
      }}
    >
      <Timer size={12} />
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}g `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </span>
  );
}
