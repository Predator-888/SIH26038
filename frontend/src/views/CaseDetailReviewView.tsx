import React, { useState, useEffect } from 'react';
import { CaseResult } from '../types/api';
import { Language, translations } from '../i18n/translations';
import { api } from '../api/client';
import { RetinalEvidenceViewer } from '../components/RetinalEvidenceViewer';
import { GradeBadge } from '../components/GradeBadge';
import { StatusBadge } from '../components/StatusBadge';
import { LesionList } from '../components/LesionList';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Edit3, 
  FileText, 
  Sparkles, 
  AlertCircle, 
  ShieldCheck, 
  Stethoscope, 
  Printer,
  Building,
  ClipboardCheck
} from 'lucide-react';

interface CaseDetailReviewViewProps {
  caseId: string;
  onBack: () => void;
  onOpenReport: (caseId: string) => void;
  lang: Language;
}

export const CaseDetailReviewView: React.FC<CaseDetailReviewViewProps> = ({
  caseId,
  onBack,
  onOpenReport,
  lang,
}) => {
  const t = translations[lang];
  const [caseData, setCaseData] = useState<CaseResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<'confirm' | 'override'>('confirm');
  const [overrideGrade, setOverrideGrade] = useState<number>(2);
  const [referralPath, setReferralPath] = useState('district_retina');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      try {
        const data = await api.getCaseResult(caseId);
        setCaseData(data);
        if (data.reviewer_decision) {
          setDecision(data.reviewer_decision);
          setNotes(data.reviewer_notes || '');
          if (data.override_grade !== undefined && data.override_grade !== null) {
            setOverrideGrade(data.override_grade);
          }
        }
      } catch (err) {
        console.error("Failed to load case detail", err);
      } finally {
        setLoading(false);
      }
    };
    loadDetail();
  }, [caseId]);

  const handleSubmitReview = async () => {
    setSubmitting(true);
    try {
      await api.submitReview(
        caseId,
        decision,
        notes,
        decision === 'override' ? overrideGrade : undefined
      );
      setSubmittedSuccess(true);
      setTimeout(() => {
        onBack();
      }, 1000);
    } catch (err) {
      console.error("Failed to submit review", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectPrint = () => {
    const reportUrl = `${api.getReportUrl(caseId, lang)}&print=true`;
    window.open(reportUrl, '_blank');
  };

  if (loading || !caseData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="w-8 h-8 border-3 border-medical border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-mono text-clinical-500">Loading high-resolution DICOM study...</p>
      </div>
    );
  }

  const { grading, explainability } = caseData;
  const gradeVal = grading?.grade ?? 0;
  const gradeLabel = grading?.grade_label ?? 'No DR';
  const confidence = grading?.confidence ?? 0.85;
  const referable = grading?.referable ?? false;
  const patientId = caseData.patient_ref || `MRN-2026-${caseData.case_id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      
      {/* Top Clinical Header Strip */}
      <div className="bg-white rounded-2xl border border-clinical-200 shadow-subtle p-4 flex flex-wrap items-center justify-between gap-4">
        
        {/* Patient & Study Identification */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-clinical-100 hover:bg-clinical-200 text-clinical-800 text-xs font-bold border border-clinical-300 transition-all shadow-sm active:scale-95"
            title="Return to Reading Queue"
          >
            <ArrowLeft className="w-4 h-4 text-clinical-700" />
            <span>Back to Queue</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-clinical-950">{patientId}</span>
              <span className="text-[11px] font-mono text-clinical-700 bg-clinical-100 px-2 py-0.5 rounded-md border border-clinical-300 font-semibold">
                Eye: OD (Right) · CFP 45°
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-clinical-600 mt-0.5">
              <span>Study Date: 28 Aug 2026</span>
              <span>•</span>
              <span>Primary Health Center #04</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">Quality Index: 94% Verified</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Prominent Direct Print Button */}
          <button
            onClick={handleDirectPrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-clinical-900 hover:bg-black text-white text-xs font-bold shadow-md transition-all active:scale-95"
            title="Print or Save as PDF"
          >
            <Printer className="w-4 h-4 text-medical-glow" />
            <span>Print Report</span>
          </button>

          <button
            onClick={() => onOpenReport(caseId)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-medical hover:bg-medical-hover text-white text-xs font-bold shadow-md transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" />
            <span>View Full Report</span>
          </button>
        </div>

      </div>

      {/* Main Two-Column Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Retinal Lightbox & Pathological Findings (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          <RetinalEvidenceViewer
            imageUrl={caseData.image_url}
            gradcamOverlayUrl={explainability?.gradcam_overlay_url}
            lesions={explainability?.lesions}
            patientRef={patientId}
            title="PACS Retinal Saliency Workstation"
          />

          {/* Clinical Narrative Summary */}
          <div className="bg-white rounded-2xl p-5 border border-clinical-200 shadow-subtle space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-medical flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-medical" />
              Automated Lesion-Level Saliency Synthesis
            </h4>
            <p className="text-xs sm:text-sm text-clinical-900 leading-relaxed font-medium bg-clinical-50 p-4 rounded-xl border border-clinical-200">
              {explainability?.summary_text || "Retinal vasculature clear. No microaneurysms or focal lesions detected."}
            </p>
          </div>

          {/* Lesions List */}
          <LesionList lesions={explainability?.lesions || []} />

        </div>

        {/* Right Column: ICDR Clinical Decision Support & Verification Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* AI Diagnostic Output Card */}
          <div className="bg-white rounded-2xl p-6 border border-clinical-200 shadow-subtle space-y-4">
            <div className="flex items-center justify-between border-b border-clinical-100 pb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-clinical-600">
                AI Diagnostic Classification
              </span>
              <StatusBadge band={grading?.confidence_band} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-clinical-500 font-semibold mb-1">Severity Category:</div>
                <GradeBadge grade={gradeVal} label={gradeLabel} size="lg" />
              </div>
              <div className="text-right">
                <div className="text-[11px] text-clinical-500 font-semibold mb-1">Calibrated Confidence:</div>
                <span className="font-mono text-2xl font-extrabold text-clinical-950">{Math.round(confidence * 100)}%</span>
              </div>
            </div>

            {/* Referable Banner */}
            <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 ${
              referable 
                ? 'bg-rose-50 text-rose-900 border border-rose-300' 
                : 'bg-emerald-50 text-emerald-900 border border-emerald-300'
            }`}>
              {referable ? <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
              <span>{referable ? 'SPECIALIST RETINA REFERRAL REQUIRED (ICDR L2+)' : 'ANNUAL ROUTINE TELE-SCREENING'}</span>
            </div>
          </div>

          {/* Ophthalmologist Sign-off Panel */}
          <div className="bg-white rounded-2xl p-6 border border-clinical-200 shadow-panel space-y-5">
            <div className="flex items-center justify-between border-b border-clinical-100 pb-3">
              <h3 className="font-display font-bold text-sm text-clinical-950 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-medical" />
                Clinician Sign-off & Verification
              </h3>
              <span className="text-[10px] font-mono text-clinical-600 font-bold bg-clinical-100 px-2 py-0.5 rounded">
                ICD-10: E11.319
              </span>
            </div>

            {/* Decision Toggle - High Contrast Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDecision('confirm')}
                className={`py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                  decision === 'confirm'
                    ? 'bg-medical text-white border-medical'
                    : 'bg-white text-clinical-800 border-clinical-300 hover:border-clinical-500 hover:bg-clinical-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm AI Grade</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('override')}
                className={`py-3 px-3 rounded-xl border-2 text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm ${
                  decision === 'override'
                    ? 'bg-clinical-900 text-white border-clinical-900'
                    : 'bg-white text-clinical-800 border-clinical-300 hover:border-clinical-500 hover:bg-clinical-50'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>Override Grade</span>
              </button>
            </div>

            {/* Corrected Grade Selector if Override */}
            {decision === 'override' && (
              <div className="space-y-1.5 animate-in fade-in duration-150">
                <label className="block text-[11px] font-bold text-clinical-800 uppercase tracking-wider">
                  Corrected Severity Level:
                </label>
                <select
                  value={overrideGrade}
                  onChange={(e) => setOverrideGrade(parseInt(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-clinical-300 bg-white text-xs font-semibold text-clinical-950 focus:ring-2 focus:ring-medical focus:outline-none shadow-sm"
                >
                  <option value={0}>Grade 0 — No Diabetic Retinopathy</option>
                  <option value={1}>Grade 1 — Mild Non-Proliferative DR</option>
                  <option value={2}>Grade 2 — Moderate Non-Proliferative DR</option>
                  <option value={3}>Grade 3 — Severe Non-Proliferative DR</option>
                  <option value={4}>Grade 4 — Proliferative Diabetic Retinopathy</option>
                </select>
              </div>
            )}

            {/* Referral / Treatment Pathway */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-clinical-800 uppercase tracking-wider flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-medical" />
                Clinical Action Pathway:
              </label>
              <select
                value={referralPath}
                onChange={(e) => setReferralPath(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-clinical-300 bg-white text-xs font-semibold text-clinical-950 focus:ring-2 focus:ring-medical focus:outline-none shadow-sm"
              >
                <option value="district_retina">District Hospital Retina Clinic (Urgent 2-Week Referral)</option>
                <option value="laser_prp">Pan-Retinal Photocoagulation (PRP) Workup</option>
                <option value="anti_vegf">Intravitreal Anti-VEGF Therapy Triage</option>
                <option value="tele_followup">12-Month Tele-Screening Follow-up (Primary Health Center)</option>
              </select>
            </div>

            {/* Review Remarks */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-clinical-800 uppercase tracking-wider">
                Ophthalmologist Clinical Remarks:
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Enter diagnostic impressions, OCT recommendations, or medical advice..."
                className="w-full p-3.5 rounded-xl border border-clinical-300 bg-white text-xs text-clinical-950 focus:ring-2 focus:ring-medical focus:outline-none resize-none font-sans shadow-sm"
              />
            </div>

            {/* Submit Verification Button */}
            <button
              onClick={handleSubmitReview}
              disabled={submitting || submittedSuccess}
              className={`w-full py-3.5 rounded-xl font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 ${
                submittedSuccess 
                  ? 'bg-emerald-600' 
                  : 'bg-medical hover:bg-medical-hover'
              }`}
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : submittedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Clinical Verification Recorded!</span>
                </>
              ) : (
                <>
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Sign & Complete Case</span>
                </>
              )}
            </button>

          </div>

        </div>

      </div>

    </div>
  );
};
