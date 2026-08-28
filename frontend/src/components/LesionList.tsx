import React from 'react';
import { Lesion } from '../types/api';
import { CheckCircle, AlertCircle } from 'lucide-react';

interface LesionListProps {
  lesions: Lesion[];
  emptyText?: string;
}

export const LesionList: React.FC<LesionListProps> = ({ 
  lesions, 
  emptyText = "No microaneurysms, hemorrhages, or exudates detected above confidence threshold." 
}) => {
  if (!lesions || lesions.length === 0) {
    return (
      <div className="bg-surface rounded-xl p-5 border border-border flex items-center gap-3 text-ink-muted text-sm shadow-card">
        <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
        <p>{emptyText}</p>
      </div>
    );
  }

  const getQuadrant = (bbox: [number, number, number, number]) => {
    const [x, y, w, h] = bbox;
    const cx = x + w / 2;
    const cy = y + h / 2;

    const distToCenter = Math.sqrt(Math.pow(cx - 0.45, 2) + Math.pow(cy - 0.50, 2));
    if (distToCenter < 0.12) return "Macular Region";

    const isSup = cy < 0.5;
    const isTemp = cx < 0.5;

    if (isSup && isTemp) return "Superior Temporal";
    if (isSup && !isTemp) return "Superior Nasal";
    if (!isSup && isTemp) return "Inferior Temporal";
    return "Inferior Nasal";
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'microaneurysm':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'exudate':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'hemorrhage':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
      <div className="px-4 py-3 bg-bg border-b border-border flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-trust">
          Indexed Pathological Findings ({lesions.length})
        </h4>
        <span className="text-[11px] text-ink-muted">U-Net Segmentor (IDRiD)</span>
      </div>

      <div className="divide-y divide-border-subtle max-h-64 overflow-y-auto">
        {lesions.map((lesion, idx) => (
          <div key={idx} className="px-4 py-2.5 flex items-center justify-between hover:bg-bg/60 transition-colors">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-ink-muted w-5">#{idx + 1}</span>
              <span className={`text-xs px-2 py-0.5 rounded font-medium border capitalize ${getBadgeStyle(lesion.type)}`}>
                {lesion.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-ink-muted font-medium">
                {getQuadrant(lesion.bbox)}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-ink-muted hidden sm:inline">
                [{lesion.bbox[0].toFixed(2)}, {lesion.bbox[1].toFixed(2)}]
              </span>
              <span className="text-xs font-mono font-bold text-ink">
                {Math.round(lesion.confidence * 100)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
