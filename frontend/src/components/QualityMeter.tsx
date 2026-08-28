import React from 'react';
import { QualityResult } from '../types/api';
import { Focus, Sun, CircleDot, CheckCircle2, XCircle } from 'lucide-react';

interface QualityMeterProps {
  quality: QualityResult;
  showDetails?: boolean;
}

export const QualityMeter: React.FC<QualityMeterProps> = ({ quality, showDetails = true }) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.75) return 'text-success bg-success';
    if (score >= 0.60) return 'text-warning bg-warning';
    return 'text-danger bg-danger';
  };

  const getScoreText = (score: number) => `${Math.round(score * 100)}%`;

  return (
    <div className="bg-surface rounded-xl p-4 border border-border shadow-card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {quality.passed ? (
            <CheckCircle2 className="w-5 h-5 text-success" />
          ) : (
            <XCircle className="w-5 h-5 text-danger" />
          )}
          <span className="font-semibold text-sm text-ink">
            {quality.passed ? 'Quality Assessment: Passed' : 'Quality Assessment: Rejected'}
          </span>
        </div>
        <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
          quality.passed ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
        }`}>
          {getScoreText(quality.quality_score)}
        </span>
      </div>

      {showDetails && (
        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border-subtle">
          
          {/* Focus Sharpness */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span className="flex items-center gap-1"><Focus className="w-3 h-3 text-trust" /> Focus</span>
              <span className="font-mono font-semibold">{getScoreText(quality.focus_score)}</span>
            </div>
            <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${getScoreColor(quality.focus_score).split(' ')[1]}`} 
                style={{ width: `${quality.focus_score * 100}%` }}
              />
            </div>
          </div>

          {/* Illumination Balance */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span className="flex items-center gap-1"><Sun className="w-3 h-3 text-primary" /> Light</span>
              <span className="font-mono font-semibold">{getScoreText(quality.illumination_score)}</span>
            </div>
            <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${getScoreColor(quality.illumination_score).split(' ')[1]}`} 
                style={{ width: `${quality.illumination_score * 100}%` }}
              />
            </div>
          </div>

          {/* Field of View */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span className="flex items-center gap-1"><CircleDot className="w-3 h-3 text-trust" /> FOV</span>
              <span className="font-mono font-semibold">{getScoreText(quality.fov_score)}</span>
            </div>
            <div className="w-full h-1.5 bg-bg rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${getScoreColor(quality.fov_score).split(' ')[1]}`} 
                style={{ width: `${quality.fov_score * 100}%` }}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
