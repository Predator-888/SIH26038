export type ConfidenceBand = 'confident_normal' | 'confident_referable' | 'uncertain_review';

export interface QualityResult {
  passed: boolean;
  quality_score: number;
  focus_score: number;
  illumination_score: number;
  fov_score: number;
  reject_reasons: string[];
}

export interface CaseUploadResponse {
  case_id: string;
  status: string;
  created_at: string;
  quality: QualityResult;
  image_url?: string;
}

export interface Lesion {
  type: 'microaneurysm' | 'exudate' | 'hemorrhage' | 'neovascularization';
  bbox: [number, number, number, number]; // [x, y, w, h] normalized 0-1
  confidence: number;
}

export interface GradingDetail {
  grade: number; // 0-4
  grade_label: string;
  referable: boolean;
  probabilities: Record<string, number>;
  confidence: number;
  confidence_band: ConfidenceBand;
}

export interface Explainability {
  gradcam_overlay_url: string;
  lesions: Lesion[];
  summary_text: string;
}

export interface CaseResult {
  case_id: string;
  patient_ref?: string;
  status: string;
  image_url: string;
  processed_image_url?: string;
  grading?: GradingDetail;
  explainability?: Explainability;
  reviewer_decision?: 'confirm' | 'override';
  reviewer_notes?: string;
  override_grade?: number;
}

export interface CaseListItem {
  case_id: string;
  patient_ref?: string;
  created_at: string;
  status: string;
  grade?: number;
  grade_label?: string;
  confidence?: number;
  confidence_band?: ConfidenceBand;
  thumbnail_url?: string;
}

export interface SimulationParams {
  num_cameras: number;
  num_reviewers: number;
  bandwidth_mbps: number;
  images_per_day_per_camera: number;
  avg_review_time_sec: number;
  ai_processing_time_sec: number;
}

export interface BacklogPoint {
  day: number;
  backlog: number;
  daily_intake: number;
  daily_processed: number;
}

export interface SimulationResult {
  run_id: string;
  annual_capacity: number;
  annual_demand: number;
  annual_screened: number;
  backlog_over_time: BacklogPoint[];
  bottleneck: 'bandwidth' | 'processing' | 'review_capacity' | 'none';
  recommendation: string;
}

export interface CompetitiveSystem {
  name: string;
  type: string;
  validation_scale: string;
  sensitivity: string;
  specificity: string;
  metric_notes: string;
  image_quality_check: string;
  explainability: string;
  lesion_breakdown: string;
  uncertainty_triage: string;
  offline_rural_ready: string;
  workflow_simulation: string;
  license_status: string;
}

export interface CompetitiveTableResponse {
  title: string;
  source_notes: string;
  systems: CompetitiveSystem[];
  defensible_innovations: Array<{ title: string; description: string }>;
}

export interface AblationVariant {
  name: string;
  qwk?: number;
  accuracy?: number;
  referable_sensitivity?: number;
  referable_specificity?: number;
  ece?: number;
  brier_score?: number;
  overconfidence_rate?: string;
  triage_reliability?: string;
  explainability_score?: string;
  notes?: string;
}

export interface AblationExperiment {
  title: string;
  description: string;
  variants?: AblationVariant[];
  degradation_curve?: Array<{
    noise_level: string;
    unenhanced_sensitivity: number;
    enhanced_pipeline_sensitivity: number;
    quality_gate_action?: string;
  }>;
}

export interface AblationResponse {
  summary: string;
  experiments: {
    preprocessing: AblationExperiment;
    feature_fusion: AblationExperiment;
    calibration: AblationExperiment;
    robustness: AblationExperiment;
  };
}

