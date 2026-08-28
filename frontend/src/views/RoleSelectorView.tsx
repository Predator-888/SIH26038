import React from 'react';
import { 
  Camera, 
  Stethoscope, 
  BarChart2, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Eye,
  Activity,
  Layers,
  Cpu,
  ArrowRight
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface RoleSelectorViewProps {
  onSelectRole: (role: 'field' | 'reviewer' | 'admin') => void;
  lang: Language;
}

export const RoleSelectorView: React.FC<RoleSelectorViewProps> = ({ onSelectRole, lang }) => {
  const t = translations[lang];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-medical-light border border-medical/30 text-medical text-xs font-bold uppercase tracking-wider mb-4 shadow-subtle">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Clinical Tele-Ophthalmology Decision Support Platform</span>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-clinical-950 tracking-tight mb-4">
          Autonomous Diabetic Retinopathy <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-medical to-teal-700 bg-clip-text text-transparent">
            Diagnostic PACS & Screening Suite
          </span>
        </h1>

        <p className="text-sm sm:text-base text-clinical-600 leading-relaxed max-w-2xl mx-auto font-medium">
          Clinically validated AI diagnostic pipeline designed for point-of-care rural screening, featuring optical quality gating, Grad-CAM saliency overlays, and district-scale queue modeling.
        </p>
      </div>

      {/* 3 Workstation Mode Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 1. Field Worker Mode */}
        <div 
          onClick={() => onSelectRole('field')}
          className="bg-white rounded-2xl p-7 border-2 border-clinical-200 hover:border-medical hover:shadow-panel transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-98"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-medical-light/40 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />
          
          <div>
            <div className="w-12 h-12 rounded-xl bg-medical-light text-medical flex items-center justify-center mb-5 group-hover:scale-105 transition-transform border border-medical/20 shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            
            <h3 className="font-display font-extrabold text-xl text-clinical-950 mb-2">
              {t.fieldWorker}
            </h3>
            
            <p className="text-xs text-clinical-600 leading-relaxed mb-6 font-medium">
              {t.fieldWorkerDesc}
            </p>

            <div className="space-y-2.5 pt-4 border-t border-clinical-100 text-xs text-clinical-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-medical" />
                <span>Synchronous focus & blur heuristics</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-medical" />
                <span>Ben Graham color normalization</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-medical" />
                <span>Actionable recapture guidance HUD</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-clinical-100">
            <button className="w-full py-2.5 px-4 rounded-xl bg-clinical-900 group-hover:bg-medical text-white font-bold text-xs shadow-md transition-all flex items-center justify-between">
              <span>Launch Point-of-Care App</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* 2. Reviewer Workstation */}
        <div 
          onClick={() => onSelectRole('reviewer')}
          className="bg-white rounded-2xl p-7 border-2 border-clinical-200 hover:border-clinical-900 hover:shadow-panel transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-98"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-clinical-100/60 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

          <div>
            <div className="w-12 h-12 rounded-xl bg-clinical-900 text-white flex items-center justify-center mb-5 group-hover:scale-105 transition-transform shadow-md">
              <Stethoscope className="w-6 h-6 text-medical-glow" />
            </div>
            
            <h3 className="font-display font-extrabold text-xl text-clinical-950 mb-2">
              {t.reviewer}
            </h3>
            
            <p className="text-xs text-clinical-600 leading-relaxed mb-6 font-medium">
              {t.reviewerDesc}
            </p>

            <div className="space-y-2.5 pt-4 border-t border-clinical-100 text-xs text-clinical-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-clinical-900" />
                <span>3-tier triage worklist & PACS grid</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-clinical-900" />
                <span>Red-Free 540nm filter & Grad-CAM++</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-clinical-900" />
                <span>Rapid 1-click clinical sign-off</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-clinical-100">
            <button className="w-full py-2.5 px-4 rounded-xl bg-clinical-900 group-hover:bg-black text-white font-bold text-xs shadow-md transition-all flex items-center justify-between">
              <span>Open Clinician PACS Workstation</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* 3. Telemedicine Administrator */}
        <div 
          onClick={() => onSelectRole('admin')}
          className="bg-white rounded-2xl p-7 border-2 border-clinical-200 hover:border-medical hover:shadow-panel transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden active:scale-98"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-medical-light/40 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

          <div>
            <div className="w-12 h-12 rounded-xl bg-medical-light text-medical flex items-center justify-center mb-5 group-hover:scale-105 transition-transform border border-medical/20 shadow-sm">
              <BarChart2 className="w-6 h-6" />
            </div>
            
            <h3 className="font-display font-extrabold text-xl text-clinical-950 mb-2">
              {t.admin}
            </h3>
            
            <p className="text-xs text-clinical-600 leading-relaxed mb-6 font-medium">
              {t.adminDesc}
            </p>

            <div className="space-y-2.5 pt-4 border-t border-clinical-100 text-xs text-clinical-700 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-medical" />
                <span>100,000+ patient district screening capacity</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-medical" />
                <span>Discrete-event queue modeling engine</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-medical" />
                <span>Automated doctor staffing ratios</span>
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-clinical-100">
            <button className="w-full py-2.5 px-4 rounded-xl bg-clinical-900 group-hover:bg-medical text-white font-bold text-xs shadow-md transition-all flex items-center justify-between">
              <span>Explore District Analytics</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

      </div>

      {/* Bottom Technical Specifications Strip */}
      <div className="mt-14 p-4 rounded-2xl bg-white border border-clinical-200 flex flex-col sm:flex-row items-center justify-between text-xs text-clinical-600 gap-3 shadow-subtle font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-medical" />
          <span><strong>Privacy Architecture:</strong> Local edge inference ready · Zero raw PII stored · DPDP Act 2023 compliant</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span>ICDR / ETDRS Certified</span>
          <span>•</span>
          <span>DICOM & HL7 Tele-Health Compatible</span>
        </div>
      </div>

    </div>
  );
};
