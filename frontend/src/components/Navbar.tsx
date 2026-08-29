import React from 'react';
import { 
  Eye, 
  Globe, 
  ShieldCheck, 
  Camera, 
  Stethoscope, 
  BarChart2, 
  Activity,
  Server,
  Award
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';

interface NavbarProps {
  currentRole: 'field' | 'reviewer' | 'admin' | 'benchmarks' | null;
  onSelectRole: (role: 'field' | 'reviewer' | 'admin' | 'benchmarks' | null) => void;
  lang: Language;
  onToggleLang: (lang: Language) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRole, onSelectRole, lang, onToggleLang }) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-clinical-200 shadow-subtle">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand / System Identity */}
        <div 
          onClick={() => onSelectRole(null)}
          className="flex items-center gap-3.5 cursor-pointer select-none group"
        >
          <div className="w-9 h-9 rounded-xl bg-medical text-white flex items-center justify-center shadow-md group-hover:bg-medical-hover transition-colors">
            <Eye className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-base tracking-tight text-clinical-950">
                Netra<span className="text-medical">AI</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-clinical-100 text-clinical-800 border border-clinical-300">
                PACS v2.4 Enterprise
              </span>
            </div>
            <p className="text-[11px] text-clinical-500 font-medium hidden sm:block">
              Clinical Tele-Ophthalmology Diagnostic System
            </p>
          </div>
        </div>

        {/* Center: Workstation Mode Selector */}
        {currentRole && (
          <nav className="flex items-center gap-1.5 bg-clinical-100 p-1.5 rounded-2xl border border-clinical-300">
            <button
              onClick={() => onSelectRole('field')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                currentRole === 'field'
                  ? 'bg-clinical-900 text-white shadow-md'
                  : 'bg-white text-clinical-700 hover:text-clinical-950 hover:bg-clinical-50'
              }`}
            >
              <Camera className={`w-3.5 h-3.5 ${currentRole === 'field' ? 'text-medical-glow' : 'text-medical'}`} />
              <span>{lang === 'en' ? 'Point-of-Care' : 'पॉइंट-ऑफ-केयर'}</span>
            </button>

            <button
              onClick={() => onSelectRole('reviewer')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                currentRole === 'reviewer'
                  ? 'bg-clinical-900 text-white shadow-md'
                  : 'bg-white text-clinical-700 hover:text-clinical-950 hover:bg-clinical-50'
              }`}
            >
              <Stethoscope className={`w-3.5 h-3.5 ${currentRole === 'reviewer' ? 'text-medical-glow' : 'text-medical'}`} />
              <span>{lang === 'en' ? 'Clinician PACS' : 'चिकित्सक'}</span>
            </button>

            <button
              onClick={() => onSelectRole('admin')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                currentRole === 'admin'
                  ? 'bg-clinical-900 text-white shadow-md'
                  : 'bg-white text-clinical-700 hover:text-clinical-950 hover:bg-clinical-50'
              }`}
            >
              <BarChart2 className={`w-3.5 h-3.5 ${currentRole === 'admin' ? 'text-medical-glow' : 'text-medical'}`} />
              <span>{lang === 'en' ? 'District Analytics' : 'एनालिटिक्स'}</span>
            </button>

            <button
              onClick={() => onSelectRole('benchmarks')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                currentRole === 'benchmarks'
                  ? 'bg-medical text-white shadow-md'
                  : 'bg-white text-clinical-700 hover:text-clinical-950 hover:bg-clinical-50'
              }`}
            >
              <Award className={`w-3.5 h-3.5 ${currentRole === 'benchmarks' ? 'text-white' : 'text-medical'}`} />
              <span>{lang === 'en' ? 'SOTA & Ablation' : 'मानक व शोध'}</span>
            </button>
          </nav>
        )}

        {/* Right: Telemetry Health, Privacy Tag & Language */}
        <div className="flex items-center gap-3">
          
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-clinical-50 border border-clinical-200 text-[11px] font-semibold text-clinical-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>PACS Connected</span>
          </div>

          <div className="hidden xl:flex items-center gap-1.5 text-[11px] text-clinical-600 font-semibold">
            <ShieldCheck className="w-4 h-4 text-medical" />
            <span>DPDP 2023 Compliant</span>
          </div>

          {/* Bilingual Switcher */}
          <button
            onClick={() => onToggleLang(lang === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-clinical-300 bg-white hover:bg-clinical-50 text-xs font-bold text-clinical-900 transition-colors shadow-sm active:scale-95"
            title="Toggle Language"
          >
            <Globe className="w-3.5 h-3.5 text-medical" />
            <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
          </button>

        </div>

      </div>
    </header>
  );
};
