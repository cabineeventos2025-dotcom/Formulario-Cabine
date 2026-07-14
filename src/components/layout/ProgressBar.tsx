import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  sectionName: string;
}

export function ProgressBar({ currentStep, totalSteps, sectionName }: ProgressBarProps) {
  const pct = totalSteps > 0 ? Math.round((currentStep / totalSteps) * 100) : 0;

  return (
    <div className="progress-wrapper" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-meta">
        <span className="progress-section-name">{sectionName}</span>
        <span className="progress-pct">{pct}% concluído</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
