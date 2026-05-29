'use client';

export default function ProgressBar({ progress = 0 }) {
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
      style={{ width: `${progress * 100}%` }}
    />
  );
}
