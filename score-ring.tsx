import { useEffect, useState } from "react";

export function ScoreRing({ percent }: { percent: number }) {
  const radius = 54;
  const circuit = 2 * Math.PI * radius;
  const target = circuit - (Math.max(0, Math.min(100, percent)) / 100) * circuit;
  const [offset, setOffset] = useState(circuit);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOffset(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 140 140" aria-hidden="true">
        <circle className="ring-track" cx="70" cy="70" r={radius} />
        <circle
          className="ring-value"
          cx="70"
          cy="70"
          r={radius}
          strokeDasharray={circuit}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="ring-label">
        <strong>{percent}%</strong>
        <span>итог</span>
      </div>
    </div>
  );
}
