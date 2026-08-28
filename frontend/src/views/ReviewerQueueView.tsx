import React, { useState, useEffect } from 'react';
import { CaseListItem } from '../types/api';
import { Language, translations } from '../i18n/translations';
import { api } from '../api/client';
import { CaseCard } from '../components/CaseCard';
import { GradeBadge } from '../components/GradeBadge';
import { StatusBadge } from '../components/StatusBadge';
import { 
  Stethoscope, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  LayoutGrid, 
  Table as TableIcon, 
  Clock, 
  TrendingUp, 
  Eye, 
  ChevronRight,
  Filter,
  Check
} from 'lucide-react';

interface ReviewerQueueViewProps {
  onSelectCase: (caseId: string) => void;
  lang: Language;
}

export const ReviewerQueueView: React.FC<ReviewerQueueViewProps> = ({ onSelectCase, lang }) => {
  const t = translations[lang];
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'uncertain' | 'referable' | 'normal'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');

  const fetchCases = async () => {
    setLoading(true);
    try {
      const resp = await api.listCases();
      setCases(resp.items);
    } catch (err) {
      console.error("Failed to load queue cases", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  // Filter cases based on search and active tab
  const filteredCases = cases.filter(c => {
    const matchesSearch = searchQuery === '' || 
      (c.patient_ref && c.patient_ref.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.case_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === 'uncertain') return c.confidence_band === 'uncertain_review' || (!c.confidence_band && c.status === 'graded');
    if (filterMode === 'referable') return c.confidence_band === 'confident_referable';
    if (filterMode === 'normal') return c.confidence_band === 'confident_normal';
    return true;
  });

  const uncertainCases = cases.filter(c => c.confidence_band === 'uncertain_review' || (!c.confidence_band && c.status === 'graded'));
  const referableCases = cases.filter(c => c.confidence_band === 'confident_referable');
  const normalCases = cases.filter(c => c.confidence_band === 'confident_normal');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Clinical Reading Room KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        
        {/* Total Queue Volume */}
        <div className="bg-white p-4 rounded-xl border border-clinical-200 shadow-subtle flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-clinical-500">
              Active Triage Queue
            </div>
            <div className="text-2xl font-display font-extrabold text-clinical-900 mt-0.5">
              {cases.length} <span className="text-xs font-sans font-normal text-clinical-500">studies</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-clinical-100 text-clinical-700 flex items-center justify-center">
            <Stethoscope className="w-5 h-5" />
          </div>
        </div>

        {/* Priority / Urgent Scans */}
        <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-subtle flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
              Priority Review (Uncertain)
            </div>
            <div className="text-2xl font-display font-extrabold text-amber-900 mt-0.5">
              {uncertainCases.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Confirmed Referable DR */}
        <div className="bg-white p-4 rounded-xl border border-rose-200/80 shadow-subtle flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
              Referable DR (L2+)
            </div>
            <div className="text-2xl font-display font-extrabold text-rose-900 mt-0.5">
              {referableCases.length}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Clinician Reading Latency */}
        <div className="bg-white p-4 rounded-xl border border-clinical-200 shadow-subtle flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-clinical-500">
              Mean Reading Time
            </div>
            <div className="text-2xl font-display font-extrabold text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <span>18s</span>
              <span className="text-[11px] font-mono font-medium text-clinical-500">(&lt;30s goal)</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Control Bar: Search, Filters, View Mode Toggle */}
      <div className="bg-white p-4 rounded-xl border border-clinical-200 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-clinical-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by Patient Ref or Study ID..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-clinical-200 bg-clinical-50/50 text-xs font-mono text-clinical-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 text-xs">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-clinical-900 text-white shadow-sm'
                : 'bg-clinical-100 text-clinical-600 hover:text-clinical-900'
            }`}
          >
            All ({cases.length})
          </button>
          <button
            onClick={() => setFilterMode('uncertain')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterMode === 'uncertain'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            Priority ({uncertainCases.length})
          </button>
          <button
            onClick={() => setFilterMode('referable')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterMode === 'referable'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            Referable ({referableCases.length})
          </button>
          <button
            onClick={() => setFilterMode('normal')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
              filterMode === 'normal'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            Normal ({normalCases.length})
          </button>
        </div>

        {/* View Switcher & Refresh */}
        <div className="flex items-center gap-2 border-t md:border-t-0 pt-2 md:pt-0 border-clinical-200">
          <div className="flex items-center bg-clinical-100 p-1 rounded-lg border border-clinical-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'kanban' ? 'bg-white text-clinical-900 shadow-sm' : 'text-clinical-500 hover:text-clinical-900'
              }`}
              title="Kanban Triage View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'table' ? 'bg-white text-clinical-900 shadow-sm' : 'text-clinical-500 hover:text-clinical-900'
              }`}
              title="PACS Data Grid View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchCases}
            disabled={loading}
            className="p-2 rounded-lg border border-clinical-200 bg-white hover:bg-clinical-50 text-clinical-700 transition-colors shadow-subtle"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Main View: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Priority Review (Uncertain Cases) */}
          <div className="space-y-3.5">
            <div className="bg-amber-50/80 p-3.5 rounded-xl border border-amber-200 flex items-center justify-between shadow-subtle">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Priority Review (Uncertain AI)</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-amber-600 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-sm">
                {uncertainCases.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {uncertainCases.length > 0 ? (
                uncertainCases.map(item => (
                  <CaseCard key={item.case_id} item={item} onSelect={onSelectCase} />
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 border border-dashed border-clinical-200 text-center text-xs text-clinical-400">
                  No priority review scans waiting.
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Referable DR (Level >= 2) */}
          <div className="space-y-3.5">
            <div className="bg-rose-50/80 p-3.5 rounded-xl border border-rose-200 flex items-center justify-between shadow-subtle">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600" />
                <span>Referable DR (High Confidence)</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-sm">
                {referableCases.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {referableCases.length > 0 ? (
                referableCases.map(item => (
                  <CaseCard key={item.case_id} item={item} onSelect={onSelectCase} />
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 border border-dashed border-clinical-200 text-center text-xs text-clinical-400">
                  No referable cases waiting.
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Confident Normal (Level 0) */}
          <div className="space-y-3.5">
            <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between shadow-subtle">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Routine / Normal (High Confidence)</span>
              </div>
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-mono text-[11px] font-bold flex items-center justify-center shadow-sm">
                {normalCases.length}
              </span>
            </div>

            <div className="space-y-2.5">
              {normalCases.length > 0 ? (
                normalCases.map(item => (
                  <CaseCard key={item.case_id} item={item} onSelect={onSelectCase} />
                ))
              ) : (
                <div className="bg-white rounded-xl p-8 border border-dashed border-clinical-200 text-center text-xs text-clinical-400">
                  No routine cases waiting.
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Table / PACS Data Grid View */
        <div className="bg-white rounded-xl border border-clinical-200 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-clinical-50 border-b border-clinical-200 font-mono text-[11px] uppercase tracking-wider text-clinical-600">
                  <th className="py-3 px-4">Patient / Study Ref</th>
                  <th className="py-3 px-4">Acquisition Time</th>
                  <th className="py-3 px-4">Eye</th>
                  <th className="py-3 px-4">AI Diagnostic Grade</th>
                  <th className="py-3 px-4">Calibrated Confidence</th>
                  <th className="py-3 px-4">Triage Priority</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-clinical-100">
                {filteredCases.map(item => {
                  const patientId = item.patient_ref || `ANON-${item.case_id.slice(0, 8).toUpperCase()}`;
                  const formattedDate = new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });

                  return (
                    <tr 
                      key={item.case_id}
                      onClick={() => onSelectCase(item.case_id)}
                      className="hover:bg-clinical-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-clinical-900 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-black overflow-hidden border border-clinical-300 flex-shrink-0">
                          {item.thumbnail_url && (
                            <img src={item.thumbnail_url} alt="Scan" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <span>{patientId}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-clinical-500">{formattedDate}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-clinical-700">OD</td>
                      <td className="py-3 px-4">
                        {item.grade !== undefined && item.grade !== null ? (
                          <GradeBadge grade={item.grade} label={item.grade_label} size="sm" />
                        ) : (
                          <span className="italic text-clinical-400">Pending</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-clinical-800">
                        {item.confidence ? `${Math.round(item.confidence * 100)}%` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge band={item.confidence_band} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-medical font-semibold text-xs group-hover:underline">
                          <span>Inspect</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
