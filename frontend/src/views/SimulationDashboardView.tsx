import React, { useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';
import { api } from '../api/client';
import { SimulationParams, SimulationResult } from '../types/api';
import { SimulationVisualizer } from '../components/SimulationVisualizer';
import { 
  BarChart2, 
  Sliders, 
  RefreshCw, 
  Cpu, 
  Wifi, 
  Users, 
  Camera, 
  Clock, 
  Sparkles,
  TrendingUp,
  Activity,
  Layers
} from 'lucide-react';

interface SimulationDashboardViewProps {
  lang: Language;
}

export const SimulationDashboardView: React.FC<SimulationDashboardViewProps> = ({ lang }) => {
  const t = translations[lang];

  const [params, setParams] = useState<SimulationParams>({
    num_cameras: 5,
    num_reviewers: 2,
    bandwidth_mbps: 4.0,
    images_per_day_per_camera: 40,
    avg_review_time_sec: 25,
    ai_processing_time_sec: 3.5,
  });

  const [result, setResult] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runSimulation = async (customParams = params) => {
    setLoading(true);
    try {
      const data = await api.runSimulation(customParams);
      setResult(data);
    } catch (err) {
      console.error("Simulation run failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, []);

  const handleSliderChange = (field: keyof SimulationParams, value: number) => {
    const newParams = { ...params, [field]: value };
    setParams(newParams);
    runSimulation(newParams);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-medical text-white flex items-center justify-center shadow-sm">
              <BarChart2 className="w-5 h-5" />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-clinical-950">
              {t.simTitle}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-clinical-600 mt-1 font-medium">
            {t.simSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono font-bold px-3 py-1.5 rounded-full bg-medical-light text-medical border border-medical/30 shadow-subtle flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-medical animate-pulse" />
            <span>Discrete-Event Telemetry Engine</span>
          </span>
        </div>
      </div>

      {/* Main Grid: Controls + Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Operational Sliders (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-clinical-200 shadow-subtle space-y-5">
          <div className="flex items-center justify-between border-b border-clinical-100 pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-clinical-900 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-medical" />
              District Operational Parameters
            </h3>
          </div>

          {/* Slider 1: Cameras */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-clinical-900">
              <span className="flex items-center gap-1.5"><Camera className="w-3.5 h-3.5 text-medical" /> {t.camerasLabel}</span>
              <span className="font-mono text-medical font-extrabold">{params.num_cameras} cameras</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={params.num_cameras}
              onChange={(e) => handleSliderChange('num_cameras', parseInt(e.target.value))}
              className="w-full h-2 bg-clinical-200 rounded-lg appearance-none cursor-pointer accent-medical"
            />
            <div className="flex justify-between text-[10px] text-clinical-500 font-mono font-semibold">
              <span>1</span>
              <span>15</span>
              <span>30</span>
            </div>
          </div>

          {/* Slider 2: Daily Scans */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-clinical-900">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-medical" /> {t.intakeLabel}</span>
              <span className="font-mono text-medical font-extrabold">{params.images_per_day_per_camera} scans/day</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={params.images_per_day_per_camera}
              onChange={(e) => handleSliderChange('images_per_day_per_camera', parseInt(e.target.value))}
              className="w-full h-2 bg-clinical-200 rounded-lg appearance-none cursor-pointer accent-medical"
            />
            <div className="flex justify-between text-[10px] text-clinical-500 font-mono font-semibold">
              <span>10</span>
              <span>55</span>
              <span>100</span>
            </div>
          </div>

          {/* Slider 3: Reviewers */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-clinical-900">
              <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-clinical-900" /> {t.reviewersLabel}</span>
              <span className="font-mono text-clinical-950 font-extrabold">{params.num_reviewers} doctors</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={params.num_reviewers}
              onChange={(e) => handleSliderChange('num_reviewers', parseInt(e.target.value))}
              className="w-full h-2 bg-clinical-200 rounded-lg appearance-none cursor-pointer accent-medical"
            />
            <div className="flex justify-between text-[10px] text-clinical-500 font-mono font-semibold">
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          {/* Slider 4: Bandwidth */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-clinical-900">
              <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-medical" /> {t.bandwidthLabel}</span>
              <span className="font-mono text-medical font-extrabold">{params.bandwidth_mbps} Mbps</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="20.0"
              step="0.5"
              value={params.bandwidth_mbps}
              onChange={(e) => handleSliderChange('bandwidth_mbps', parseFloat(e.target.value))}
              className="w-full h-2 bg-clinical-200 rounded-lg appearance-none cursor-pointer accent-medical"
            />
            <div className="flex justify-between text-[10px] text-clinical-500 font-mono font-semibold">
              <span>0.5 Mbps</span>
              <span>10 Mbps</span>
              <span>20 Mbps</span>
            </div>
          </div>

          {/* Slider 5: Review Latency */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-bold text-clinical-900">
              <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-medical" /> {t.reviewTimeLabel}</span>
              <span className="font-mono text-medical font-extrabold">{params.avg_review_time_sec} sec</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="5"
              value={params.avg_review_time_sec}
              onChange={(e) => handleSliderChange('avg_review_time_sec', parseInt(e.target.value))}
              className="w-full h-2 bg-clinical-200 rounded-lg appearance-none cursor-pointer accent-medical"
            />
            <div className="flex justify-between text-[10px] text-clinical-500 font-mono font-semibold">
              <span>10s (Fast)</span>
              <span>30s (Target)</span>
              <span>60s</span>
            </div>
          </div>

          {/* Preset Buttons - High Contrast */}
          <div className="pt-4 border-t border-clinical-100">
            <span className="block text-[11px] text-clinical-700 uppercase font-bold tracking-wider mb-2">Operational Configurations:</span>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  const p = { num_cameras: 10, num_reviewers: 4, bandwidth_mbps: 8.0, images_per_day_per_camera: 45, avg_review_time_sec: 20, ai_processing_time_sec: 2.5 };
                  setParams(p);
                  runSimulation(p);
                }}
                className="p-3 rounded-xl bg-clinical-100 hover:bg-clinical-200 border border-clinical-300 text-clinical-900 font-bold text-left transition-all shadow-sm active:scale-95"
              >
                100k District Scale
              </button>
              <button
                type="button"
                onClick={() => {
                  const p = { num_cameras: 8, num_reviewers: 1, bandwidth_mbps: 2.0, images_per_day_per_camera: 40, avg_review_time_sec: 40, ai_processing_time_sec: 4.0 };
                  setParams(p);
                  runSimulation(p);
                }}
                className="p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-900 font-bold text-left transition-all shadow-sm active:scale-95"
              >
                Capacity Alert Mode
              </button>
            </div>
          </div>

        </div>

        {/* Right: Visualizer & Output Metrics (8 cols) */}
        <div className="lg:col-span-8">
          {result ? (
            <SimulationVisualizer result={result} />
          ) : (
            <div className="h-64 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-medical border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
