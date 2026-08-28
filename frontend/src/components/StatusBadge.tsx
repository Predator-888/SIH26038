import React from 'react';
import { ConfidenceBand } from '../types/api';
import { CheckCircle2, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  band?: ConfidenceBand | 'pending' | 'reviewed';
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ band = 'pending', label, size = 'md' }) => {
  let style = 'bg-clinical-100 text-clinical-700 border-clinical-200';
  let Icon = Clock;
  let text = label || 'Pending Analysis';

  if (band === 'confident_normal') {
    style = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    Icon = CheckCircle2;
    text = label || 'Confident Normal (L0)';
  } else if (band === 'confident_referable') {
    style = 'bg-rose-50 text-rose-700 border-rose-200';
    Icon = AlertCircle;
    text = label || 'Referable DR (High Conf)';
  } else if (band === 'uncertain_review') {
    style = 'bg-amber-50 text-amber-800 border-amber-200';
    Icon = AlertTriangle;
    text = label || 'Priority Review (Uncertain)';
  } else if (band === 'reviewed') {
    style = 'bg-teal-50 text-teal-800 border-teal-200';
    Icon = CheckCircle2;
    text = label || 'Clinician Verified';
  }

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2'
  }[size];

  return (
    <span className={`inline-flex items-center font-medium rounded-full border shadow-subtle ${style} ${sizeClasses}`}>
      <Icon className={size === 'lg' ? 'w-4 h-4' : 'w-3 h-3'} />
      <span className="font-semibold">{text}</span>
    </span>
  );
};
