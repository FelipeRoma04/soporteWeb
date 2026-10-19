import { useEffect, useState } from 'react';

export default function MetricsCard({ label, value, trend, icon, color = 'orange' }) {
  const numericValue = Number(value);
  const isNumeric = Number.isFinite(numericValue);
  const [displayValue, setDisplayValue] = useState(isNumeric ? 0 : value);

  useEffect(() => {
    if (!isNumeric) {
      setDisplayValue(value);
      return undefined;
    }

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setDisplayValue(numericValue);
      return undefined;
    }

    let frame;
    let startTime;
    const initialValue = 0;
    const duration = 1050;

    const animate = (time) => {
      if (startTime === undefined) startTime = time;
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - (1 - progress) ** 4;
      setDisplayValue(progress === 1 ? numericValue : Math.round(initialValue + (numericValue - initialValue) * easedProgress));
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };

    setDisplayValue(initialValue);
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [isNumeric, numericValue, value]);

  return (
    <article className="stat-card">
      <div className={`stat-icon ${color}`} aria-hidden="true">{icon}</div>
      <div className="stat-copy">
        <p>{label}</p>
        <strong aria-label={String(value)}><span aria-hidden="true">{displayValue}</span></strong>
        <small className={color === 'green' ? 'positive' : undefined}>{trend}</small>
      </div>
    </article>
  );
}
