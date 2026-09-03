import React, { useState } from 'react';
import { Lesion } from '../types/api';
import { resolveImageUrl } from '../api/client';
import { 
  Layers, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  MapPin, 
  Eye, 
  Sliders, 
  Compass, 
  Maximize2,
  Minimize2,
  Scan,
  Activity,
  Crosshair,
  Filter
} from 'lucide-react';

interface RetinalEvidenceViewerProps {
  imageUrl: string;
  gradcamOverlayUrl?: string;
  lesions?: Lesion[];
  title?: string;
  patientRef?: string;
  eye?: 'OD' | 'OS';
}

export const RetinalEvidenceViewer: React.FC<RetinalEvidenceViewerProps> = ({
  imageUrl,
  gradcamOverlayUrl,
  lesions = [],
  title = "PACS Retinal Saliency Workstation",
  patientRef = "STUDY-2026-DR",
  eye = "OD"
}) => {
  // PACS Workstation State
  const [showGradcam, setShowGradcam] = useState(true);
  const [opacity, setOpacity] = useState(0.65);
  const [showLesionPins, setShowLesionPins] = useState(true);
  const [redFreeFilter, setRedFreeFilter] = useState(false);
  const [invertFilter, setInvertFilter] = useState(false);
  const [showQuadrantHUD, setShowQuadrantHUD] = useState(true);
  const [activeLesion, setActiveLesion] = useState<Lesion | null>(null);
  const [zoom, setZoom] = useState(1);
  const [colormap, setColormap] = useState<'jet' | 'turbo' | 'thermal'>('jet');

  // Compute quadrant counts
  const quadrantCounts = {
    ST: 0,
    SN: 0,
    IT: 0,
    IN: 0
  };

  lesions.forEach(l => {
    const [x, y] = l.bbox;
    if (y < 0.5 && x < 0.5) quadrantCounts.ST++;
    else if (y < 0.5 && x >= 0.5) quadrantCounts.SN++;
    else if (y >= 0.5 && x < 0.5) quadrantCounts.IT++;
    else quadrantCounts.IN++;
  });

  const getLesionColor = (type: string) => {
    switch (type) {
      case 'microaneurysm':
        return 'bg-amber-400 border-amber-200 text-amber-950 shadow-amber-500/50';
      case 'exudate':
        return 'bg-emerald-400 border-emerald-200 text-emerald-950 shadow-emerald-500/50';
      case 'hemorrhage':
        return 'bg-rose-500 border-rose-200 text-white shadow-rose-500/50';
      case 'neovascularization':
        return 'bg-purple-500 border-purple-200 text-white shadow-purple-500/50';
      default:
        return 'bg-teal-400 border-teal-200 text-teal-950 shadow-teal-500/50';
    }
  };

  return (
    <div className="bg-pacs-base rounded-2xl border border-pacs-border shadow-pacs overflow-hidden flex flex-col select-none">
      
      {/* Top PACS Header & Toolbelt */}
      <div className="px-4 py-3 bg-pacs-panel border-b border-pacs-border flex flex-wrap items-center justify-between gap-3">
        
        {/* Title & DICOM Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-medical-glow animate-pulse" />
            <span className="font-mono text-xs font-bold text-white tracking-wider uppercase">
              {title}
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono text-clinical-400 px-2 py-0.5 rounded bg-pacs-surface border border-pacs-border">
            {patientRef} · Eye: <strong className="text-white">{eye}</strong> (Right)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Red-Free (Green Channel) Toggle */}
          <button
            onClick={() => setRedFreeFilter(!redFreeFilter)}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all border ${
              redFreeFilter
                ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-sm'
                : 'bg-pacs-surface text-clinical-400 border-pacs-border hover:text-white'
            }`}
            title="Red-Free Green Channel Filter (Gold standard for microaneurysm contrast)"
          >
            Red-Free (540nm)
          </button>

          {/* Saliency Heatmap Switch */}
          {gradcamOverlayUrl && (
            <div className="flex items-center gap-1.5 bg-pacs-surface px-2.5 py-1 rounded-lg border border-pacs-border text-xs text-clinical-300">
              <Layers className="w-3.5 h-3.5 text-medical-glow" />
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-white">
                <input
                  type="checkbox"
                  checked={showGradcam}
                  onChange={(e) => setShowGradcam(e.target.checked)}
                  className="rounded text-medical-glow focus:ring-0 accent-medical-glow"
                />
                Grad-CAM++
              </label>

              {showGradcam && (
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={opacity}
                  onChange={(e) => setOpacity(parseFloat(e.target.value))}
                  className="w-14 h-1 bg-clinical-700 rounded-lg appearance-none cursor-pointer accent-medical-glow ml-1"
                  title="Heatmap Transparency"
                />
              )}
            </div>
          )}

          {/* Lesion Pins Switch */}
          {lesions.length > 0 && (
            <button
              onClick={() => setShowLesionPins(!showLesionPins)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition-all ${
                showLesionPins
                  ? 'bg-medical-dark text-medical-glow border-medical/50'
                  : 'bg-pacs-surface text-clinical-400 border-pacs-border hover:text-white'
              }`}
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Pins ({lesions.length})</span>
            </button>
          )}

          {/* Quadrant HUD Radar Toggle */}
          <button
            onClick={() => setShowQuadrantHUD(!showQuadrantHUD)}
            className={`p-1.5 rounded-lg border text-xs transition-all ${
              showQuadrantHUD
                ? 'bg-pacs-surface text-white border-pacs-border'
                : 'bg-pacs-base text-clinical-500 border-transparent hover:text-white'
            }`}
            title="Toggle Retinal Quadrants HUD"
          >
            <Compass className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Toolbar */}
          <div className="flex items-center bg-pacs-surface rounded-lg border border-pacs-border p-0.5">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.25))}
              className="p-1 text-clinical-400 hover:text-white rounded"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 text-clinical-300">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2.5, zoom + 0.25))}
              className="p-1 text-clinical-400 hover:text-white rounded"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 text-clinical-400 hover:text-white rounded border-l border-pacs-border"
              title="Reset 1:1"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

        </div>

      </div>

      {/* Main PACS Darkroom Lightbox Stage */}
      <div className="relative bg-pacs-base p-6 sm:p-8 flex items-center justify-center min-h-[420px] sm:min-h-[500px] overflow-hidden select-none">
        
        {/* Optical Circular Vignette Frame */}
        <div 
          className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] rounded-full overflow-hidden border-2 border-pacs-border ring-8 ring-pacs-panel shadow-2xl transition-transform duration-200 bg-black flex items-center justify-center"
          style={{ transform: `scale(${zoom})` }}
        >
          {/* Base Fundus Image with filters */}
          <img
            src={resolveImageUrl(imageUrl)}
            alt="Fundus Scan"
            className="w-full h-full object-cover transition-all"
            style={{
              filter: `${redFreeFilter ? 'grayscale(100%) brightness(1.2) contrast(1.4) sepia(100%) hue-rotate(90deg)' : ''} ${invertFilter ? 'invert(100%)' : ''}`
            }}
          />

          {/* Grad-CAM Saliency Heatmap Layer */}
          {gradcamOverlayUrl && showGradcam && (
            <img
              src={resolveImageUrl(gradcamOverlayUrl)}
              alt="Grad-CAM Saliency"
              className="absolute inset-0 w-full h-full object-cover mix-blend-screen transition-opacity duration-200 pointer-events-none"
              style={{ opacity: opacity }}
            />
          )}

          {/* Interactive Pathology Callout Pins */}
          {showLesionPins && lesions.map((lesion, idx) => {
            const [bx, by, bw, bh] = lesion.bbox;
            const leftPct = (bx + bw / 2) * 100;
            const topPct = (by + bh / 2) * 100;
            const isActive = activeLesion === lesion;

            return (
              <div
                key={idx}
                className="absolute z-30 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                onClick={() => setActiveLesion(isActive ? null : lesion)}
                onMouseEnter={() => setActiveLesion(lesion)}
              >
                {/* Pulsing Medical Marker Pin */}
                <div className={`w-4 h-4 rounded-full border-2 shadow-lg transition-transform group-hover:scale-125 flex items-center justify-center ${getLesionColor(lesion.type)}`}>
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                </div>

                {/* DICOM Measurement Chip */}
                {isActive && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max bg-pacs-panel/95 text-white text-[11px] px-3 py-1.5 rounded-lg shadow-2xl border border-medical-glow/40 backdrop-blur pointer-events-none z-40 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-medical-glow text-[10px]">
                      <span>#{idx + 1}</span>
                      <span>{lesion.type.replace('_', ' ')}</span>
                    </div>
                    <div className="font-mono text-[10px] text-clinical-300 mt-0.5 flex items-center gap-2">
                      <span>Conf: <strong className="text-white">{Math.round(lesion.confidence * 100)}%</strong></span>
                      <span>Dim: {(bw * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Quadrant Crosshair Grid Overlay */}
          {showQuadrantHUD && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
              <div className="w-full h-px bg-white/40" />
              <div className="h-full w-px bg-white/40 absolute" />
            </div>
          )}

        </div>

        {/* Top-Left DICOM Metadata Overlay */}
        <div className="absolute top-4 left-4 pointer-events-none text-[10px] font-mono text-clinical-400 space-y-0.5 bg-pacs-base/80 p-2 rounded-lg border border-pacs-border/60 backdrop-blur">
          <div>PATIENT: <span className="text-white font-bold">{patientRef}</span></div>
          <div>STUDY: CFP 45° RETINAL SCAN</div>
          <div>EYE: <span className="text-medical-glow font-bold">OD (RIGHT)</span></div>
          <div>FOV: 45 DEGREE POSTERIOR POLE</div>
        </div>

        {/* Top-Right Technical Specifications HUD */}
        <div className="absolute top-4 right-4 pointer-events-none text-[10px] font-mono text-clinical-400 text-right space-y-0.5 bg-pacs-base/80 p-2 rounded-lg border border-pacs-border/60 backdrop-blur">
          <div>ZOOM: <span className="text-white font-bold">{Math.round(zoom * 100)}%</span></div>
          <div>RED-FREE: <span className={redFreeFilter ? 'text-emerald-400 font-bold' : 'text-clinical-500'}>{redFreeFilter ? 'ON (540nm)' : 'OFF'}</span></div>
          <div>SALIENCY: <span className="text-medical-glow font-bold">Grad-CAM++</span></div>
          <div>RESOLUTION: 512 × 512 px</div>
        </div>

        {/* Bottom-Right Quadrant Radar Widget */}
        {showQuadrantHUD && (
          <div className="absolute bottom-4 right-4 bg-pacs-panel/90 border border-pacs-border p-2.5 rounded-xl text-[10px] font-mono shadow-lg backdrop-blur">
            <div className="text-[9px] uppercase font-bold text-clinical-400 mb-1 flex items-center gap-1">
              <Compass className="w-3 h-3 text-medical-glow" />
              <span>Quadrant Radar</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-center">
              <div className="bg-pacs-surface p-1 rounded border border-pacs-border">
                <span className="text-clinical-400">ST: </span>
                <strong className={quadrantCounts.ST > 0 ? 'text-amber-400' : 'text-white'}>{quadrantCounts.ST}</strong>
              </div>
              <div className="bg-pacs-surface p-1 rounded border border-pacs-border">
                <span className="text-clinical-400">SN: </span>
                <strong className={quadrantCounts.SN > 0 ? 'text-amber-400' : 'text-white'}>{quadrantCounts.SN}</strong>
              </div>
              <div className="bg-pacs-surface p-1 rounded border border-pacs-border">
                <span className="text-clinical-400">IT: </span>
                <strong className={quadrantCounts.IT > 0 ? 'text-amber-400' : 'text-white'}>{quadrantCounts.IT}</strong>
              </div>
              <div className="bg-pacs-surface p-1 rounded border border-pacs-border">
                <span className="text-clinical-400">IN: </span>
                <strong className={quadrantCounts.IN > 0 ? 'text-amber-400' : 'text-white'}>{quadrantCounts.IN}</strong>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom PACS Footer Toolbar */}
      <div className="px-4 py-2.5 bg-pacs-panel border-t border-pacs-border flex flex-wrap items-center justify-between text-xs text-clinical-400">
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="text-white font-medium">Pathological Markers:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Neovascularization
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Hemorrhage
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Hard Exudate
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Microaneurysm
          </span>
        </div>

        <div className="text-[11px] font-mono text-clinical-400">
          Ben Graham Normalization · 512×512 Standard
        </div>
      </div>

    </div>
  );
};
