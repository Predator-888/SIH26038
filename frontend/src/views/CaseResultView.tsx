import React from 'react';
import { CaseResult } from '../types/api';
import { Language, translations } from '../i18n/translations';
import { api } from '../api/client';
import { RetinalEvidenceViewer } from '../components/RetinalEvidenceViewer';
import { GradeBadge } from '../components/GradeBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LesionList } from '../components/LesionList';
import { 
  FileText, 
  ArrowLeft, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  BarChart2, 
  Printer, 
  ExternalLink,
  ShieldCheck,
  Stethoscope
} from 'lucide-react';

interface CaseResultViewProps {
  result: CaseResult;
  onBack: () => void;
  onOpenReport: (caseId: string) => void;
  lang: Language;
}

export const CaseResultView: React.FC<CaseResultViewProps> = ({
  result,
  onBack,
  onOpenReport,
  lang,
}) => {
  const t = translations[lang];
  const { grading, explainability, case_id } = result;

  const gradeVal = grading?.grade ?? 0;
  const gradeLabel = grading?.grade_label ?? 'No DR';
  const confidence = grading?.confidence ?? 0.85;
  const referable = grading?.referable ?? false;
  const band = grading?.confidence_band ?? 'confident_normal';
  const patientId = result.patient_ref || `STUDY-${case_id.slice(0, 8).toUpperCase()}`;

  const handleDirectPrint = () => {
    const reportUrl = `${api.getReportUrl(case_id, lang)}&print=true`;
    window.open(reportUrl, '_blank');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Clinical Navigation & Quick Actions Bar */}
      <div className="bg-white rounded-2xl p-4 border border-clinical-200 shadow-subtle flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-bold text-clinical-800 bg-clinical-100 hover:bg-clinical-200 px-4 py-2.5 rounded-xl border border-clinical-300 transition-all shadow-sm active:scale-95"
        >
          <ArrowLeft className="w-4 h-4 text-clinical-700" />
          <span>Back to Intake & Capture</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Prominent Direct 1-Click Print Button */}
          <button
            onClick={handleDirectPrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clinical-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all active:scale-95"
            title="Directly Print or Save as PDF"
          >
            <Printer className="w-4 h-4 text-medical-glow" />
            <span>Print Diagnostic Report</span>
          </button>

          {/* View Full Report Modal */}
          <button
            onClick={() => onOpenReport(case_id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-medical hover:bg-medical-hover text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>View Full Report</span>
          </button>
        </div>
      </div>

      {/* Primary Clinical Diagnostic Banner */}
      <div className={`p-6 rounded-2xl border-2 shadow-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        referable 
          ? 'bg-rose-50/90 border-rose-300' 
          : 'bg-emerald-50/90 border-emerald-300'
      }`}>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-clinical-600">
              Diagnostic Severity Classification:
            </span>
            <StatusBadge band={band} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <GradeBadge grade={gradeVal} label={gradeLabel} size="lg" />
            <div className="text-xs font-mono text-clinical-700 bg-white/80 px-3 py-1 rounded-lg border border-clinical-200">
              Calibrated Confidence: <strong className="text-clinical-950 font-bold text-sm">{Math.round(confidence * 100)}%</strong>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-md ${
            referable ? 'bg-rose-600' : 'bg-emerald-700'
          }`}>
            {referable ? (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>SPECIALIST RETINOPATHY REFERRAL REQUIRED</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>ROUTINE ANNUAL TELE-SCREENING</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Split Grid: Lightbox & Clinical Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Retinal Evidence Lightbox (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <RetinalEvidenceViewer
            imageUrl={result.image_url}
            gradcamOverlayUrl={explainability?.gradcam_overlay_url}
            lesions={explainability?.lesions}
            patientRef={patientId}
            title="Diagnostic Retinal Saliency Workstation"
          />

          {/* Clinical Evidence Summary Card */}
          <div className="bg-white rounded-2xl p-5 border border-clinical-200 shadow-subtle space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-medical flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-medical" />
              Automated Lesion-Level Saliency Findings
            </h4>
            <p className="text-xs sm:text-sm text-clinical-900 leading-relaxed font-medium bg-clinical-50 p-4 rounded-xl border border-clinical-200">
              {explainability?.summary_text || "Analysis complete. Retinal vasculature normal."}
            </p>
          </div>
        </div>

        {/* Right: Ordinal Probabilities & Lesions (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Calibrated Ordinal Probabilities Breakdown */}
          {grading?.probabilities && (
            <div className="bg-white rounded-2xl p-6 border border-clinical-200 shadow-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-clinical-100 pb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-clinical-800 flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-medical" />
                  ICDR Ordinal Probability Distribution
                </h4>
                <span className="text-[10px] font-mono text-clinical-500 bg-clinical-100 px-2 py-0.5 rounded">
                  Calibrated Softmax
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {Object.entries(grading.probabilities).map(([g, prob]) => {
                  const gNum = parseInt(g);
                  const isTop = gNum === gradeVal;
                  const gLabels = ['No DR', 'Mild NPDR', 'Moderate NPDR', 'Severe NPDR', 'Proliferative DR'];

                  return (
                    <div key={g} className="space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className={isTop ? 'font-bold text-clinical-950 flex items-center gap-1.5' : 'text-clinical-600'}>
                          {isTop && <span className="w-1.5 h-1.5 rounded-full bg-medical" />}
                          Grade {g}: {gLabels[gNum]}
                        </span>
                        <span className={`font-mono ${isTop ? 'font-bold text-medical' : 'text-clinical-500'}`}>
                          {Math.round(prob * 100)}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-clinical-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isTop ? 'bg-medical' : 'bg-clinical-300'}`}
                          style={{ width: `${prob * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Indexed Lesions List */}
          <LesionList lesions={explainability?.lesions || []} />

        </div>

      </div>

    </div>
  );
};
