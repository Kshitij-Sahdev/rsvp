'use client';

export default function WpmBadge({ wpm, multiplier }) {
  const showMult = multiplier && Math.abs(multiplier - 1.0) > 0.05;
  
  return (
    <div className="wpm-display">
      <span className="reader-badge">{wpm} WPM</span>
      <span className={`reader-badge speed-mult ${showMult ? 'visible' : ''}`}>
        ×{(multiplier || 1).toFixed(1)}
      </span>
    </div>
  );
}
