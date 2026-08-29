import React, { useState, useEffect } from 'react';
import { 
  Award, 
  ShieldCheck, 
  Layers, 
  Cpu, 
  Activity, 
  ExternalLink, 
  TrendingUp, 
  Sliders, 
  AlertCircle, 
  CheckCircle2, 
  Info,
  Sparkles,
  Zap,
  BarChart3,
  Scale
} from 'lucide-react';
import { api } from '../api/client';
import { CompetitiveTableResponse, AblationResponse } from '../types/api';

export const BenchmarkAblationView: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [compData, setCompData] = useState<CompetitiveTableResponse | null>(null);
  const [ablationData, setAblationData] = useState<AblationResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'preprocessing' | 'fusion' | 'calibration' | 'robustness'>('benchmarks');
  const [noiseLevelIndex, setNoiseLevelIndex] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [comp, ablation] = await Promise.all([
          api.getCompetitiveTable(),
          api.getAblationResults()
        ]);
        setCompData(comp);
        setAblationData(ablation);
      } catch (err) {
        console.error('Failed to load benchmark data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="w-12 h-12 border-4 border-medical border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-clinical-600">Loading Clinical Validation & Benchmark Data...</p>
      </div>
    );
  }

  const noiseData = ablationData?.experiments.robustness.degradation_curve || [];
  const selectedNoise = noiseData[noiseLevelIndex] || noiseData[0];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-clinical-950 via-clinical-900 to-pacs-panel rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-white/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-medical/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-medical/20 border border-medical/40 text-medical-glow text-xs font-bold tracking-wider uppercase">
              <Award className="w-3.5 h-3.5" />
              <span>SIH26038 Clinical Validation & SOTA Benchmarks</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Defensible Clinical Differentiation & Ablation Suite
            </h1>
            <p className="text-clinical-200 text-sm max-w-2xl leading-relaxed">
              Grounded comparison against verified real-world deployments (Google ARDA, EyeArt, IDx-DR) and empirical multi-stage ablation experiments.
            </p>
          </div>

          {/* SOTA Target Badge */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-center min-w-[200px]">
            <div className="text-[11px] text-clinical-300 uppercase font-semibold tracking-wider">SIH26038 Target</div>
            <div className="text-2xl font-black text-emerald-400">&gt;90% / &gt;85%</div>
            <div className="text-xs text-clinical-200">Sens / Spec on Referable DR</div>
          </div>
        </div>
      </div>

      {/* 2. Four Defensible Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {compData?.defensible_innovations.map((pillar, idx) => (
          <div 
            key={idx} 
            className="bg-white rounded-2xl p-5 border border-clinical-200 shadow-subtle hover:shadow-md transition-all space-y-2 relative overflow-hidden group"
          >
            <div className="w-8 h-8 rounded-xl bg-medical-glow/10 text-medical flex items-center justify-center font-bold text-sm">
              0{idx + 1}
            </div>
            <h3 className="text-sm font-bold text-clinical-950 group-hover:text-medical transition-colors">
              {pillar.title}
            </h3>
            <p className="text-xs text-clinical-600 leading-relaxed">
              {pillar.description}
            </p>
          </div>
        ))}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-clinical-200 pb-2">
        <button
          onClick={() => setActiveTab('benchmarks')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'benchmarks'
              ? 'bg-medical text-white shadow-md'
              : 'bg-clinical-100 text-clinical-700 hover:bg-clinical-200'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Peer-Reviewed SOTA Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('preprocessing')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'preprocessing'
              ? 'bg-medical text-white shadow-md'
              : 'bg-clinical-100 text-clinical-700 hover:bg-clinical-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ablation: Preprocessing</span>
        </button>

        <button
          onClick={() => setActiveTab('fusion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'fusion'
              ? 'bg-medical text-white shadow-md'
              : 'bg-clinical-100 text-clinical-700 hover:bg-clinical-200'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Ablation: Multi-Task Fusion</span>
        </button>

        <button
          onClick={() => setActiveTab('calibration')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'calibration'
              ? 'bg-medical text-white shadow-md'
              : 'bg-clinical-100 text-clinical-700 hover:bg-clinical-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Ablation: Calibration (ECE)</span>
        </button>

        <button
          onClick={() => setActiveTab('robustness')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'robustness'
              ? 'bg-medical text-white shadow-md'
              : 'bg-clinical-100 text-clinical-700 hover:bg-clinical-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Field Robustness Stress Test</span>
        </button>
      </div>

      {/* 4. Tab Contents */}
      {activeTab === 'benchmarks' && (
        <div className="space-y-6">
          {/* Comparative Matrix Table */}
          <div className="bg-white rounded-3xl border border-clinical-200 shadow-subtle overflow-hidden">
            <div className="p-6 bg-clinical-50/70 border-b border-clinical-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-clinical-950 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-medical" />
                  Verified Competitive Performance Matrix
                </h3>
                <p className="text-xs text-clinical-600 mt-0.5">
                  Sources: FDA De Novo clearances, JAMA Network Open (2025), PMC peer-reviewed clinical studies.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-clinical-100/60 border-b border-clinical-200 text-clinical-800 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Screening System</th>
                    <th className="py-3.5 px-4">Validation Scale / Deployment</th>
                    <th className="py-3.5 px-4">Sens / Spec</th>
                    <th className="py-3.5 px-4">Image Quality Check</th>
                    <th className="py-3.5 px-4">Explainability & Lesions</th>
                    <th className="py-3.5 px-4">Uncertainty Triage</th>
                    <th className="py-3.5 px-4">Simulink Capacity Model</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-clinical-100 font-medium">
                  {compData?.systems.map((sys, idx) => {
                    const isOurs = sys.name.includes("NetraAI");
                    return (
                      <tr 
                        key={idx}
                        className={`transition-colors ${
                          isOurs ? 'bg-medical-glow/5 font-semibold text-clinical-950 border-l-4 border-l-medical' : 'hover:bg-clinical-50/50 text-clinical-800'
                        }`}
                      >
                        <td className="py-4 px-4">
                          <div className="font-bold text-sm text-clinical-950 flex items-center gap-1.5">
                            {sys.name}
                            {isOurs && (
                              <span className="px-2 py-0.5 rounded-full bg-medical text-white text-[9px] font-extrabold uppercase">
                                Our Solution
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-clinical-500 font-normal">{sys.type}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-clinical-900">{sys.validation_scale}</div>
                          <div className="text-[10px] text-clinical-500 font-mono mt-0.5">{sys.metric_notes}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-mono font-bold text-xs text-clinical-950">
                            <span className="text-emerald-700">{sys.sensitivity}</span> / <span className="text-clinical-700">{sys.specificity}</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-[11px]">
                          {sys.image_quality_check}
                        </td>

                        <td className="py-4 px-4 text-[11px]">
                          <div className="font-semibold text-clinical-900">{sys.explainability}</div>
                          <div className="text-[10px] text-clinical-500">{sys.lesion_breakdown}</div>
                        </td>

                        <td className="py-4 px-4 text-[11px]">
                          {sys.uncertainty_triage}
                        </td>

                        <td className="py-4 px-4">
                          {sys.workflow_simulation === "None" ? (
                            <span className="inline-flex items-center gap-1 text-rose-600 font-mono text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              None
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              Simulink Discrete-Event
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Jury Pitch & Defense Card */}
          <div className="bg-gradient-to-br from-clinical-900 to-pacs-panel rounded-3xl p-6 sm:p-8 text-white space-y-4 shadow-lg border border-white/10">
            <div className="flex items-center gap-2 text-medical-glow font-bold text-xs tracking-wider uppercase">
              <Sparkles className="w-4 h-4 text-medical-glow" />
              <span>Grounded Jury Defense & Refined Pitch Framing</span>
            </div>
            <blockquote className="text-sm sm:text-base leading-relaxed text-clinical-100 italic border-l-2 border-medical pl-4">
              "Existing systems prove autonomous DR screening works — Google ARDA alone has screened 600,000+ patients in Tamil Nadu at 97% sensitivity. We do not claim to out-detect them. Our contribution is that no existing commercial or academic system explains its reasoning per-lesion, nor connects its confidence triage directly into a Simulink capacity model for district-level ophthalmologist staffing. We close that loop."
            </blockquote>
          </div>
        </div>
      )}

      {/* Preprocessing Ablation Tab */}
      {activeTab === 'preprocessing' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-clinical-200 shadow-subtle space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-clinical-950">
              {ablationData?.experiments.preprocessing.title}
            </h3>
            <p className="text-xs text-clinical-600">
              {ablationData?.experiments.preprocessing.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ablationData?.experiments.preprocessing.variants?.map((v, idx) => (
              <div 
                key={idx}
                className={`rounded-2xl p-5 border transition-all space-y-4 ${
                  idx === 2 ? 'bg-medical-glow/5 border-medical/50 ring-2 ring-medical/20 shadow-md' : 'bg-clinical-50/60 border-clinical-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-clinical-950 uppercase tracking-wide">{v.name}</h4>
                  {idx === 2 && (
                    <span className="px-2 py-0.5 rounded-full bg-medical text-white text-[9px] font-black uppercase">
                      Selected
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Quadratic Weighted Kappa (QWK):</span>
                    <span className="font-mono font-bold text-sm text-clinical-950">{v.qwk}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Accuracy:</span>
                    <span className="font-mono font-bold text-sm text-clinical-950">{Math.round((v.accuracy || 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Referable DR Sensitivity:</span>
                    <span className="font-mono font-bold text-sm text-emerald-700">{Math.round((v.referable_sensitivity || 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Referable DR Specificity:</span>
                    <span className="font-mono font-bold text-sm text-clinical-800">{Math.round((v.referable_specificity || 0) * 100)}%</span>
                  </div>
                </div>

                <p className="text-[11px] text-clinical-600 bg-white p-3 rounded-xl border border-clinical-200 leading-relaxed">
                  {v.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Multi-Task Fusion Ablation Tab */}
      {activeTab === 'fusion' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-clinical-200 shadow-subtle space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-clinical-950">
              {ablationData?.experiments.feature_fusion.title}
            </h3>
            <p className="text-xs text-clinical-600">
              {ablationData?.experiments.feature_fusion.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ablationData?.experiments.feature_fusion.variants?.map((v, idx) => (
              <div 
                key={idx}
                className={`rounded-2xl p-5 border transition-all space-y-4 ${
                  idx === 2 ? 'bg-medical-glow/5 border-medical/50 ring-2 ring-medical/20 shadow-md' : 'bg-clinical-50/60 border-clinical-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-clinical-950 uppercase tracking-wide">{v.name}</h4>
                  {idx === 2 && (
                    <span className="px-2 py-0.5 rounded-full bg-medical text-white text-[9px] font-black uppercase">
                      Integrated
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">QWK Score:</span>
                    <span className="font-mono font-bold text-sm text-clinical-950">{v.qwk}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Explainability Level:</span>
                    <span className="font-semibold text-xs text-medical">{v.explainability_score}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Referable Sensitivity:</span>
                    <span className="font-mono font-bold text-sm text-emerald-700">{Math.round((v.referable_sensitivity || 0) * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Referable Specificity:</span>
                    <span className="font-mono font-bold text-sm text-clinical-800">{Math.round((v.referable_specificity || 0) * 100)}%</span>
                  </div>
                </div>

                <p className="text-[11px] text-clinical-600 bg-white p-3 rounded-xl border border-clinical-200 leading-relaxed">
                  {v.notes}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calibration Ablation Tab */}
      {activeTab === 'calibration' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-clinical-200 shadow-subtle space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-clinical-950">
              {ablationData?.experiments.calibration.title}
            </h3>
            <p className="text-xs text-clinical-600">
              {ablationData?.experiments.calibration.description}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {ablationData?.experiments.calibration.variants?.map((v, idx) => (
              <div 
                key={idx}
                className={`rounded-2xl p-5 border transition-all space-y-4 ${
                  idx === 2 ? 'bg-medical-glow/5 border-medical/50 ring-2 ring-medical/20 shadow-md' : 'bg-clinical-50/60 border-clinical-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-clinical-950 uppercase tracking-wide">{v.name}</h4>
                  {idx === 2 && (
                    <span className="px-2 py-0.5 rounded-full bg-medical text-white text-[9px] font-black uppercase">
                      Optimal
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Expected Calibration Error (ECE):</span>
                    <span className="font-mono font-bold text-sm text-clinical-950">{v.ece}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Brier Score:</span>
                    <span className="font-mono font-bold text-sm text-clinical-950">{v.brier_score}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-clinical-600">Overconfidence Rate:</span>
                    <span className="font-mono font-bold text-sm text-rose-600">{v.overconfidence_rate}</span>
                  </div>
                </div>

                <p className="text-[11px] text-clinical-600 bg-white p-3 rounded-xl border border-clinical-200 leading-relaxed">
                  {v.triage_reliability}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field Robustness Tab */}
      {activeTab === 'robustness' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-clinical-200 shadow-subtle space-y-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-clinical-950">
              {ablationData?.experiments.robustness.title}
            </h3>
            <p className="text-xs text-clinical-600">
              {ablationData?.experiments.robustness.description}
            </p>
          </div>

          {/* Interactive Stress Slider */}
          <div className="bg-clinical-50 p-6 rounded-2xl border border-clinical-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-clinical-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-medical" />
                Simulated Optical Blur & Illumination Decay:
                <span className="font-mono font-bold text-medical">{selectedNoise.noise_level}</span>
              </label>
              {selectedNoise.quality_gate_action && (
                <span className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  {selectedNoise.quality_gate_action}
                </span>
              )}
            </div>

            <input
              type="range"
              min="0"
              max={noiseData.length - 1}
              value={noiseLevelIndex}
              onChange={(e) => setNoiseLevelIndex(parseInt(e.target.value))}
              className="w-full h-2 bg-clinical-200 rounded-lg appearance-none cursor-pointer accent-medical"
            />

            {/* Metric Comparison Display */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white p-4 rounded-xl border border-clinical-200 text-center space-y-1">
                <div className="text-[11px] text-clinical-500 uppercase font-semibold">Unenhanced Standard CNN</div>
                <div className="text-2xl font-black font-mono text-clinical-700">
                  {Math.round(selectedNoise.unenhanced_sensitivity * 100)}%
                </div>
                <div className="text-[11px] text-clinical-500">Referable Sensitivity</div>
              </div>

              <div className="bg-medical-glow/10 p-4 rounded-xl border border-medical/40 text-center space-y-1">
                <div className="text-[11px] text-medical uppercase font-bold">Proposed Preprocessed & Gated Pipeline</div>
                <div className="text-2xl font-black font-mono text-emerald-700">
                  {Math.round(selectedNoise.enhanced_pipeline_sensitivity * 100)}%
                </div>
                <div className="text-[11px] text-emerald-800 font-semibold">Referable Sensitivity Retained</div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
