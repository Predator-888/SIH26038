import React from 'react';

interface GradeBadgeProps {
  grade: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showLevelTag?: boolean;
}

export const GradeBadge: React.FC<GradeBadgeProps> = ({ 
  grade, 
  label, 
  size = 'md',
  showLevelTag = true 
}) => {
  const getStyle = (g: number) => {
    switch (g) {
      case 0:
        return 'bg-emerald-600 text-white';
      case 1:
        return 'bg-amber-600 text-white';
      case 2:
        return 'bg-orange-600 text-white';
      case 3:
        return 'bg-rose-600 text-white';
      case 4:
        return 'bg-rose-800 text-white ring-2 ring-rose-300';
      default:
        return 'bg-clinical-600 text-white';
    }
  };

  const defaultLabels = [
    'No Diabetic Retinopathy',
    'Mild NPDR',
    'Moderate NPDR',
    'Severe NPDR',
    'Proliferative DR'
  ];
  const displayLabel = label || defaultLabels[grade] || `Grade ${grade}`;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3.5 py-1.5 font-bold tracking-tight'
  }[size];

  return (
    <span className={`inline-flex items-center rounded-lg shadow-sm font-sans tracking-tight ${getStyle(grade)} ${sizeClasses}`}>
      {showLevelTag && (
        <span className="font-mono text-[10px] uppercase opacity-90 px-1.5 py-0.5 rounded bg-black/20 mr-1.5">
          ICDR L{grade}
        </span>
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
