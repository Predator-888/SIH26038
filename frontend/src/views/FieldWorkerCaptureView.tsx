import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Check, 
  AlertCircle, 
  FileText, 
  ArrowRight, 
  Scan, 
  Eye, 
  ShieldCheck,
  CheckCircle2,
  User,
  Activity,
  Building2,
  FolderOpen
} from 'lucide-react';
import { Language, translations } from '../i18n/translations';
import { api } from '../api/client';
import { CaseUploadResponse } from '../types/api';
import { ErrorBanner } from '../components/ErrorBanner';

interface FieldWorkerCaptureViewProps {
  onUploadSuccess: (uploadData: CaseUploadResponse, file: File) => void;
  lang: Language;
}

export const FieldWorkerCaptureView: React.FC<FieldWorkerCaptureViewProps> = ({ onUploadSuccess, lang }) => {
  const t = translations[lang];
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Real Clinical Intake Fields
  const [patientId, setPatientId] = useState('');
  const [patientAge, setPatientAge] = useState('54');
  const [patientGender, setPatientGender] = useState<'M' | 'F' | 'O'>('F');
  const [eyeSide, setEyeSide] = useState<'OD' | 'OS'>('OD');
  const [diabeticYears, setDiabeticYears] = useState('8');
  const [hba1c, setHba1c] = useState('7.6');
  const [clinicSite, setClinicSite] = useState('PHC-Rural-East-04');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid fundus image (JPEG or PNG).');
      return;
    }
    setError(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // High-fidelity clinical retinal image generator for testing
  const loadClinicalBenchmarkScan = async (type: 'normal' | 'moderate' | 'severe' | 'blurry') => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Black camera border
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 512, 512);

    // Retinal fundus orange-red base disc
    const grad = ctx.createRadialGradient(256, 256, 30, 256, 256, 238);
    grad.addColorStop(0, '#D95B28');
    grad.addColorStop(0.5, '#BA3815');
    grad.addColorStop(0.85, '#871E09');
    grad.addColorStop(1, '#4A0D03');

    ctx.beginPath();
    ctx.arc(256, 256, 235, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Macular Foveal Avascular Zone (Darker central region)
    const maculaGrad = ctx.createRadialGradient(210, 256, 5, 210, 256, 45);
    maculaGrad.addColorStop(0, '#420B03');
    maculaGrad.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(210, 256, 45, 0, Math.PI * 2);
    ctx.fillStyle = maculaGrad;
    ctx.fill();

    // Optic Disc (Nasal side with physiological cupping)
    ctx.beginPath();
    ctx.arc(380, 256, 34, 0, Math.PI * 2);
    ctx.fillStyle = '#FFEAA7';
    ctx.shadowColor = '#FFB830';
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Optic Cup
    ctx.beginPath();
    ctx.arc(380, 256, 16, 0, Math.PI * 2);
    ctx.fillStyle = '#FFF8E1';
    ctx.fill();

    // Major Retinal Vascular Arcades
    const drawVessel = (startX: number, startY: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, endX: number, endY: number, width: number) => {
      ctx.strokeStyle = '#520B04';
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
      ctx.stroke();
    };

    drawVessel(380, 256, 330, 190, 220, 165, 120, 155, 4.5);
    drawVessel(330, 190, 280, 130, 200, 110, 130, 105, 2.5);
    drawVessel(380, 256, 330, 320, 220, 345, 115, 355, 4.5);
    drawVessel(330, 320, 270, 380, 190, 400, 125, 410, 2.5);
    drawVessel(380, 256, 420, 210, 460, 180, 485, 170, 3.0);
    drawVessel(380, 256, 420, 300, 460, 330, 485, 340, 3.0);

    // Add lesions based on scenario
    if (type === 'moderate' || type === 'severe') {
      // Hard Exudates
      ctx.fillStyle = '#FFFDE7';
      ctx.shadowColor = '#FFE082';
      ctx.shadowBlur = 4;
      [
        [240, 235, 4], [250, 240, 3], [235, 255, 4.5], [260, 250, 3.5],
        [175, 220, 3], [165, 235, 4]
      ].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.shadowBlur = 0;

      // Hemorrhages
      ctx.fillStyle = '#380402';
      [
        [180, 280, 6], [160, 295, 5], [290, 210, 5.5], [195, 210, 4.5]
      ].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });

      // Microaneurysms
      ctx.fillStyle = '#610602';
      [
        [220, 210, 2], [270, 280, 2.5], [185, 320, 2], [305, 310, 2.5]
      ].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (type === 'severe') {
      ctx.fillStyle = '#260201';
      [
        [280, 330, 9], [150, 290, 8], [310, 180, 7.5]
      ].forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (type === 'blurry') {
      ctx.filter = 'blur(16px)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `study_${type}_45deg.jpg`, { type: 'image/jpeg' });
        setPatientId(`MRN-2026-${Math.floor(10000 + Math.random() * 90000)}`);
        handleFileChange(file);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    const refString = patientId ? `${patientId} · Age:${patientAge} · ${eyeSide}` : undefined;

    try {
      const response = await api.uploadCase(selectedFile, refString);
      onUploadSuccess(response, selectedFile);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || 'Failed to connect to backend server. Verify server is running on port 8000.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-clinical-900 tracking-tight">
          Patient Intake & Fundus Image Acquisition
        </h2>
        <p className="text-xs sm:text-sm text-clinical-500 mt-1">
          Record patient clinical parameters and upload 45° posterior pole retinal scan for automated quality verification.
        </p>
      </div>

      {error && (
        <div className="mb-5">
          <ErrorBanner message={error} onRetry={handleUpload} />
        </div>
      )}

      {/* Main Two-Column Intake Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Patient Medical Record Form (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-clinical-200 shadow-subtle space-y-4">
          <div className="flex items-center gap-2 border-b border-clinical-100 pb-3">
            <User className="w-4 h-4 text-medical" />
            <h3 className="font-display font-bold text-sm text-clinical-900">
              Patient Clinical Record
            </h3>
          </div>

          {/* Patient MRN */}
          <div>
            <label className="block text-[11px] font-bold text-clinical-700 uppercase tracking-wider mb-1">
              Medical Record Number (MRN)
            </label>
            <input
              type="text"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. MRN-2026-84920"
              className="w-full px-3.5 py-2 rounded-lg border border-clinical-200 bg-clinical-50/50 text-xs font-mono text-clinical-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical transition-all"
            />
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-clinical-700 uppercase tracking-wider mb-1">
                Age (Years)
              </label>
              <input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-clinical-200 bg-clinical-50/50 text-xs font-mono text-clinical-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-clinical-700 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-clinical-200 bg-clinical-50/50 text-xs font-medium text-clinical-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical"
              >
                <option value="F">Female</option>
                <option value="M">Male</option>
                <option value="O">Other</option>
              </select>
            </div>
          </div>

          {/* Eye Side Selection */}
          <div>
            <label className="block text-[11px] font-bold text-clinical-700 uppercase tracking-wider mb-1">
              Eye Under Examination
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEyeSide('OD')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                  eyeSide === 'OD'
                    ? 'bg-medical text-white border-medical shadow-sm'
                    : 'bg-clinical-50 text-clinical-600 border-clinical-200 hover:bg-white'
                }`}
              >
                OD (Right Eye)
              </button>
              <button
                type="button"
                onClick={() => setEyeSide('OS')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all border ${
                  eyeSide === 'OS'
                    ? 'bg-medical text-white border-medical shadow-sm'
                    : 'bg-clinical-50 text-clinical-600 border-clinical-200 hover:bg-white'
                }`}
              >
                OS (Left Eye)
              </button>
            </div>
          </div>

          {/* Diabetic History & HbA1c */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-clinical-700 uppercase tracking-wider mb-1">
                DM Duration (Yrs)
              </label>
              <input
                type="number"
                value={diabeticYears}
                onChange={(e) => setDiabeticYears(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-clinical-200 bg-clinical-50/50 text-xs font-mono text-clinical-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-clinical-700 uppercase tracking-wider mb-1">
                HbA1c Level (%)
              </label>
              <input
                type="text"
                value={hba1c}
                onChange={(e) => setHba1c(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-clinical-200 bg-clinical-50/50 text-xs font-mono text-clinical-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical"
              />
            </div>
          </div>

          {/* Primary Health Center Site */}
          <div>
            <label className="block text-[11px] font-bold text-clinical-700 uppercase tracking-wider mb-1">
              Screening PHC Center
            </label>
            <input
              type="text"
              value={clinicSite}
              onChange={(e) => setClinicSite(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-clinical-200 bg-clinical-50/50 text-xs font-mono text-clinical-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-medical"
            />
          </div>

        </div>

        {/* Right Column: Fundus Capture & Quality Dropzone (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-clinical-200 shadow-subtle space-y-5 flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between border-b border-clinical-100 pb-3 mb-4">
              <h3 className="font-display font-bold text-sm text-clinical-900 flex items-center gap-2">
                <Camera className="w-4 h-4 text-medical" />
                Fundus Optical Acquisition
              </h3>
              <span className="text-[11px] font-mono text-clinical-500">45° CFP Modality</span>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[260px] relative overflow-hidden ${
                previewUrl 
                  ? 'border-medical bg-medical-light/30' 
                  : 'border-clinical-300 hover:border-medical hover:bg-clinical-50/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-3 flex flex-col items-center z-10">
                  <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-medical shadow-lg bg-black ring-4 ring-medical-light">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-xs font-semibold text-clinical-900 flex items-center gap-1.5 bg-white px-3 py-1 rounded-full border border-clinical-200 shadow-subtle">
                    <CheckCircle2 className="w-4 h-4 text-medical" />
                    <span className="font-mono">{selectedFile?.name}</span>
                    <span className="text-clinical-400">({((selectedFile?.size || 0) / 1024 / 1024).toFixed(1)}MB)</span>
                  </div>
                  <p className="text-[11px] text-clinical-500">Tap to replace scan</p>
                </div>
              ) : (
                <div className="space-y-3 flex flex-col items-center">
                  <div className="w-14 h-14 rounded-2xl bg-medical-light text-medical flex items-center justify-center shadow-subtle">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-clinical-900">
                      Drag & Drop Fundus Scan or Tap to Upload
                    </p>
                    <p className="text-xs text-clinical-500 mt-1 max-w-xs leading-relaxed">
                      Supports JPEG, PNG up to 15MB. Preprocessing and quality scoring will execute synchronously.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Benchmark Studies */}
          <div className="pt-2">
            <div className="flex items-center gap-2 text-[11px] font-bold text-clinical-500 uppercase tracking-wider mb-2">
              <FolderOpen className="w-3.5 h-3.5 text-medical" />
              <span>Load Reference Test Scans:</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => loadClinicalBenchmarkScan('normal')}
                className="p-2 rounded-lg bg-clinical-50 hover:bg-clinical-100 border border-clinical-200 text-clinical-800 font-semibold text-center transition-colors"
              >
                Normal (L0)
              </button>
              <button
                type="button"
                onClick={() => loadClinicalBenchmarkScan('moderate')}
                className="p-2 rounded-lg bg-clinical-50 hover:bg-clinical-100 border border-clinical-200 text-clinical-800 font-semibold text-center transition-colors"
              >
                Moderate (L2)
              </button>
              <button
                type="button"
                onClick={() => loadClinicalBenchmarkScan('severe')}
                className="p-2 rounded-lg bg-clinical-50 hover:bg-clinical-100 border border-clinical-200 text-clinical-800 font-semibold text-center transition-colors"
              >
                Severe (L3)
              </button>
              <button
                type="button"
                onClick={() => loadClinicalBenchmarkScan('blurry')}
                className="p-2 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-semibold text-center transition-colors"
              >
                Blurry Scan
              </button>
            </div>
          </div>

          {/* Upload Button */}
          <button
            disabled={!selectedFile || loading}
            onClick={handleUpload}
            className="w-full py-3.5 px-4 rounded-xl bg-medical hover:bg-medical-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Evaluating Image Quality...</span>
              </>
            ) : (
              <>
                <span>Verify Image Quality & Register Study</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

        </div>

      </div>

    </div>
  );
};
