import React from 'react';
import { CaseListItem } from '../types/api';
import { GradeBadge } from './GradeBadge';
import { StatusBadge } from './StatusBadge';
import { ChevronRight, Calendar, User } from 'lucide-react';

interface CaseCardProps {
  item: CaseListItem;
  onSelect: (caseId: string) => void;
}

export const CaseCard: React.FC<CaseCardProps> = ({ item, onSelect }) => {
  const formattedDate = new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const patientId = item.patient_ref || `ANON-${item.case_id.slice(0, 8).toUpperCase()}`;

  return (
    <div 
      onClick={() => onSelect(item.case_id)}
      className="bg-surface rounded-xl p-4 border border-border hover:border-trust hover:shadow-card-hover transition-all cursor-pointer flex items-center justify-between group"
    >
      <div className="flex items-center gap-4">
        {/* Circular Thumbnail */}
        <div className="w-14 h-14 rounded-full bg-black border-2 border-trust overflow-hidden flex-shrink-0 shadow-sm">
          {item.thumbnail_url ? (
            <img 
              src={item.thumbnail_url} 
              alt="Thumbnail" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
            />
          ) : (
            <div className="w-full h-full bg-trust/20 flex items-center justify-center text-trust font-bold text-xs">
              SCAN
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-ink">{patientId}</span>
            <span className="text-[11px] text-ink-muted flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {formattedDate}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {item.grade !== undefined && item.grade !== null ? (
              <GradeBadge grade={item.grade} label={item.grade_label} size="sm" />
            ) : (
              <span className="text-xs text-ink-muted font-medium italic">Pending Grading</span>
            )}

            {item.confidence_band && (
              <StatusBadge band={item.confidence_band} size="sm" />
            )}
          </div>
        </div>
      </div>

      {/* Right action button */}
      <div className="flex items-center gap-2 text-ink-muted group-hover:text-trust transition-colors">
        <span className="text-xs font-semibold hidden sm:inline">Review</span>
        <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
