import React from 'react';
import { SimulationResult } from '../types/api';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Users, 
  Wifi, 
  Cpu, 
  ShieldCheck,
  Check
} from 'lucide-react';

interface SimulationVisualizerProps {
  result: SimulationResult;
}

export const SimulationVisualizer: React.FC<SimulationVisualizerProps> = ({ result }) => {
  const maxBacklog = Math.max(...result.backlog_over_time.map(p => p.backlog), 100);
  const chartHeight = 180;
  const chartWidth = 500;

  // Generate SVG polyline points for backlog curve
  const points = result.backlog_over_time.map((p, idx) => {
    const x = (idx / (result.backlog_over_time.length - 1)) * chartWidth;
    const y = chartHeight - (p.backlog / maxBacklog) * (chartHeight - 30) - 15;
    return `${x},${y}`;
  }).join(' ');

  const getBottleneckInfo = (b: string) => {
    switch (b) {
      case 'review_capacity': 
        return {
          icon: <Users className="w-5 h-5 text-amber-700" />,
          title: "Clinician Review Capacity",
          color: "text-amber-900 bg-amber-50 border-amber-300"
        };
      case 'bandwidth': 
        return {
          icon: <Wifi className="w-5 h-5 text-rose-700" />,
          title: "Cellular Uplink Bandwidth",
          color: "text-rose-900 bg-rose-50 border-rose-300"
        };
      case 'processing': 
        return {
          icon: <Cpu className="w-5 h-5 text-medical" />,
          title: "AI Inference Server Latency",
          color: "text-teal-900 bg-teal-50 border-teal-300"
        };
      default: 
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-700" />,
          title: "Optimal Flow (No Bottleneck)",
          color: "text-emerald-900 bg-emerald-50 border-emerald-300"
        };
    }
  };

  const bottleneckInfo = getBottleneckInfo(result.bottleneck);
  const percentScreened = Math.round((result.annual_screened / Math.max(1, result.annual_demand)) * 100);

  return (
    <div className="space-y-6">
      
      {/* Top 3 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Metric 1: Annual Capacity */}
        <div className="bg-white p-5 rounded-2xl border border-clinical-200 shadow-subtle">
          <div className="text-[11px] font-bold uppercase tracking-wider text-clinical-600 mb-1">
            Annual Throughput Capacity
          </div>
          <div className="text-2xl font-display font-extrabold text-clinical-950">
            {result.annual_capacity.toLocaleString()} <span className="text-xs font-sans font-normal text-clinical-500">patients/yr</span>
          </div>
          <div className="text-xs text-clinical-600 mt-1 flex items-center gap-1 font-mono font-medium">
            <span>Annual Target Demand: {result.annual_demand.toLocaleString()}</span>
          </div>
        </div>

        {/* Metric 2: Screening Coverage Rate */}
        <div className="bg-white p-5 rounded-2xl border border-clinical-200 shadow-subtle">
          <div className="text-[11px] font-bold uppercase tracking-wider text-clinical-600 mb-1">
            District Coverage Rate
          </div>
          <div className={`text-2xl font-display font-extrabold ${percentScreened >= 95 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {percentScreened}%
          </div>
          <div className="w-full bg-clinical-200 rounded-full h-2 mt-2 overflow-hidden">
            <div 
              className={`h-full rounded-full ${percentScreened >= 95 ? 'bg-emerald-600' : 'bg-rose-600'}`} 
              style={{ width: `${Math.min(100, percentScreened)}%` }} 
            />
          </div>
        </div>

        {/* Metric 3: Active Bottleneck */}
        <div className="bg-white p-5 rounded-2xl border border-clinical-200 shadow-subtle">
          <div className="text-[11px] font-bold uppercase tracking-wider text-clinical-600 mb-1">
            System Constraint
          </div>
          <div className="flex items-center gap-2 mt-1">
            {bottleneckInfo.icon}
            <span className="font-bold text-xs text-clinical-950 truncate">
              {bottleneckInfo.title}
            </span>
          </div>
          <div className="text-[10px] text-clinical-500 mt-1 font-mono font-medium">
            Discrete-Event Queue Sim
          </div>
        </div>

      </div>

      {/* Backlog Trajectory Chart */}
      <div className="bg-white p-6 rounded-2xl border border-clinical-200 shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="font-display font-bold text-sm text-clinical-950 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-medical" />
              Patient Queue Backlog Evolution (365 Operational Days)
            </h4>
            <p className="text-xs text-clinical-600 font-medium">
              Simulates daily intake fluctuation vs. clinical reader throughput
            </p>
          </div>
          <div className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-clinical-100 text-clinical-900 border border-clinical-300 w-fit shadow-sm">
            Peak Backlog: {Math.max(...result.backlog_over_time.map(p => p.backlog))} cases
          </div>
        </div>

        {/* SVG Canvas */}
        <div className="w-full overflow-x-auto pt-2">
          <div className="min-w-[500px] h-[190px] relative bg-clinical-50 rounded-xl p-3 border border-clinical-200 flex flex-col justify-end">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="backlogGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#E11D48" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#E11D48" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1={chartHeight - 15} x2={chartWidth} y2={chartHeight - 15} stroke="#CBD5E1" strokeDasharray="3" />
              <line x1="0" y1={chartHeight / 2} x2={chartWidth} y2={chartHeight / 2} stroke="#CBD5E1" strokeDasharray="3" />

              {/* Filled Area */}
              <polygon
                points={`0,${chartHeight - 15} ${points} ${chartWidth},${chartHeight - 15}`}
                fill="url(#backlogGradient)"
              />

              {/* Backlog Line */}
              <polyline
                fill="none"
                stroke="#E11D48"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
              />
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between text-[10px] text-clinical-600 font-mono font-semibold pt-1">
              <span>Day 1 (Q1)</span>
              <span>Day 90 (Q2)</span>
              <span>Day 180 (Mid-Year)</span>
              <span>Day 270 (Q3)</span>
              <span>Day 365 (Year End)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actionable Staffing Recommendation Box */}
      <div className="bg-medical-light border-2 border-medical/40 p-5 rounded-2xl shadow-subtle">
        <div className="flex items-start gap-3.5">
          <div className="p-2 rounded-xl bg-medical text-white flex-shrink-0 mt-0.5 shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h5 className="font-display font-bold text-sm text-clinical-950">
              Operational Telemedicine Capacity Guidance:
            </h5>
            <p className="text-xs text-clinical-900 mt-1 leading-relaxed font-semibold">
              {result.recommendation}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};
