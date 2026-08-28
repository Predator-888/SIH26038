import React, { useEffect, useState } from 'react';
import { Language, translations } from '../i18n/translations';
import { api } from '../api/client';
import { CaseResult } from '../types/api';
import { Eye, Sparkles, CheckCircle2 } from 'lucide-react';

export interface ProcessingViewProps {
  caseId: string;
  onComplete?: (result: CaseResult) => void;
  onAnalysisComplete?: (result: CaseResult) => void;
  onError: (errorMsg: string) => void;
  lang: Language;
}

export const ProcessingView: React.FC<ProcessingViewProps> = ({
  caseId,
  onComplete,
  onAnalysisComplete,
  onError,
  lang
}) => {
  const t = translations[lang];
  const [step, setStep] = useState(0);

  const steps = [
    { title: t.analyzingVessels, time: '0–2s' },
    { title: t.analyzingGrading, time: '2–4s' },
    { title: t.analyzingExplainability, time: '4–6s' }
  ];

  useEffect(() => {
    let timer1 = setTimeout(() => setStep(1), 1800);
    let timer2 = setTimeout(() => setStep(2), 3600);

    const executePipeline = async () => {
      try {
        // Trigger pipeline execution
        await api.analyzeCase(caseId);
        // Fetch full results
        const result = await api.getCaseResult(caseId);
        // Small delay for smooth visual transition
        setTimeout(() => {
          if (onComplete) onComplete(result);
          if (onAnalysisComplete) onAnalysisComplete(result);
        }, 1200);
      } catch (err: any) {
        const msg = err.response?.data?.error?.message || 'Pipeline analysis failed. Please try again.';
        onError(msg);
      }
    };

    executePipeline();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [caseId]);

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-8">
      
      {/* Animated Optical Scanning Radar Graphic */}
      <div className="relative w-44 h-44 mx-auto rounded-full bg-black border-4 border-medical shadow-2xl overflow-hidden flex items-center justify-center ring-8 ring-medical-light">
        {/* Subtle glowing retina representation */}
        <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#661406] via-[#C4411C] to-[#E66A35] opacity-80" />

        {/* Retinal Scanning Laser Line */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-medical/60 to-transparent w-full h-12 animate-radar pointer-events-none" />

        {/* Center Iris Hub */}
        <div className="absolute w-10 h-10 rounded-full bg-medical text-white flex items-center justify-center shadow-lg">
          <Eye className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* Title & Stage Indicators */}
      <div className="space-y-3">
        <h3 className="font-display text-2xl font-extrabold text-clinical-950">
          {t.analyzingTitle}
        </h3>
        <p className="text-xs font-mono text-clinical-600">
          Study ID: <span className="font-bold text-medical">{caseId.slice(0, 13)}</span>
        </p>
      </div>

      {/* Progress Steps */}
      <div className="space-y-3 text-left max-w-sm mx-auto bg-white p-5 rounded-2xl border border-clinical-200 shadow-panel">
        {steps.map((s, idx) => (
          <div key={idx} className="flex items-center gap-3 text-xs font-medium">
            {step > idx ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : step === idx ? (
              <div className="w-4 h-4 border-2 border-medical border-t-transparent rounded-full animate-spin flex-shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-clinical-300 flex-shrink-0" />
            )}
            <span className={step === idx ? 'font-bold text-medical' : step > idx ? 'text-clinical-950 line-through opacity-60 font-semibold' : 'text-clinical-400'}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
};
