import React from 'react';
import { CaseUploadResponse } from '../types/api';
import { Language, translations } from '../i18n/translations';
import { QualityMeter } from '../components/QualityMeter';
import { CheckCircle2, AlertTriangle, ArrowRight, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';

export interface QualityFeedbackViewProps {
  uploadData: CaseUploadResponse;
  file?: File;
  imageUrl?: string;
  onProceed: (caseId: string) => void;
  onRetake: () => void;
  lang: Language;
}

export const QualityFeedbackView: React.FC<QualityFeedbackViewProps> = ({
  uploadData,
  file,
  imageUrl,
  onProceed,
  onRetake,
  lang,
}) => {
  const t = translations[lang];
  const { quality, case_id } = uploadData;

  const getReasonAdvice = (reason: string) => {
    switch (reason) {
      case 'blur':
        return t.blur;
      case 'underexposed':
        return t.underexposed;
      case 'overexposed':
        return t.overexposed;
      case 'incomplete_fov':
        return t.incomplete_fov;
      default:
        return 'Please ensure clean optical alignment and retake.';
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border-2 text-center shadow-panel ${
        quality.passed 
          ? 'bg-emerald-50 border-emerald-300' 
          : 'bg-amber-50 border-amber-300'
      }`}>
        <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-sm ${
          quality.passed ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
        }`}>
          {quality.passed ? (
            <CheckCircle2 className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>

        <h2 className="font-display text-2xl font-extrabold text-clinical-950 mb-1">
          {quality.passed ? t.qualityPassed : t.qualityRejected}
        </h2>
        <p className="text-xs sm:text-sm text-clinical-700 max-w-md mx-auto font-medium">
          {quality.passed ? t.qualityPassedDesc : t.qualityRejectedDesc}
        </p>
      </div>

      {/* Quality Breakdown Metrics */}
      <QualityMeter quality={quality} />

      {/* Rejection Reasons Callout if failed */}
      {!quality.passed && quality.reject_reasons.length > 0 && (
        <div className="bg-white rounded-2xl p-5 border-2 border-rose-300 shadow-subtle space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Field Recapture Instructions:
          </h4>
          <ul className="space-y-2 text-xs sm:text-sm text-clinical-900">
            {quality.reject_reasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2 bg-rose-50 p-3 rounded-xl border border-rose-200 font-semibold">
                <span className="font-bold text-rose-600">•</span>
                <span>{getReasonAdvice(reason)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Actions - High Contrast Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {quality.passed ? (
          <button
            onClick={() => onProceed(case_id)}
            className="flex-1 py-3.5 px-5 rounded-xl bg-medical hover:bg-medical-hover text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 group active:scale-95"
          >
            <span>{t.proceedToAnalysis}</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </button>
        ) : (
          <>
            <button
              onClick={onRetake}
              className="flex-1 py-3.5 px-5 rounded-xl bg-clinical-900 hover:bg-black text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{t.retakeBtn}</span>
            </button>
            <button
              onClick={() => onProceed(case_id)}
              className="py-3.5 px-4 rounded-xl bg-white hover:bg-clinical-50 border-2 border-clinical-300 text-clinical-900 text-xs font-bold transition-colors shadow-sm active:scale-95"
              title="Force diagnostic override (Clinician review required)"
            >
              Override & Analyze
            </button>
          </>
        )}
      </div>

    </div>
  );
};
