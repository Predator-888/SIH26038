import axios from 'axios';
import { 
  CaseUploadResponse, 
  CaseResult, 
  CaseListItem, 
  SimulationParams, 
  SimulationResult 
} from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'X-API-Key': 'DEMO-HEALTH-CORRIDOR-SIH2026',
  },
  timeout: 30000,
});

export const api = {
  // 1. Upload & Synchronous Quality Assessment
  uploadCase: async (file: File, patientRef?: string): Promise<CaseUploadResponse> => {
    const formData = new FormData();
    formData.append('image', file);
    if (patientRef) {
      formData.append('patient_ref', patientRef);
    }
    const response = await apiClient.post<CaseUploadResponse>('/cases/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // 2. Trigger ML Inference Pipeline
  analyzeCase: async (caseId: string): Promise<{ case_id: string; status: string }> => {
    const response = await apiClient.post(`/cases/${caseId}/analyze`);
    return response.data;
  },

  // 3. Get Case Results & Explainability
  getCaseResult: async (caseId: string): Promise<CaseResult> => {
    const response = await apiClient.get<CaseResult>(`/cases/${caseId}/result`);
    return response.data;
  },

  // 4. List Reviewer Worklist
  listCases: async (status?: string, confidenceBand?: string): Promise<{ total: number; items: CaseListItem[] }> => {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    if (confidenceBand) params.confidence_band = confidenceBand;
    const response = await apiClient.get('/cases', { params });
    return response.data;
  },

  // 5. Submit Clinical Review Decision
  submitReview: async (
    caseId: string, 
    decision: 'confirm' | 'override', 
    notes?: string, 
    overrideGrade?: number
  ) => {
    const response = await apiClient.post(`/cases/${caseId}/review`, {
      reviewer_decision: decision,
      reviewer_notes: notes,
      override_grade: overrideGrade,
    });
    return response.data;
  },

  // 6. Run Telemedicine Workflow Simulation
  runSimulation: async (params: SimulationParams): Promise<SimulationResult> => {
    const response = await apiClient.post<SimulationResult>('/simulate', params);
    return response.data;
  },

  // 7. Get Diagnostic Report URL
  getReportUrl: (caseId: string, lang: string = 'en') => {
    return `${API_BASE_URL}/cases/${caseId}/report?lang=${lang}`;
  },

  // 8. Health Check
  getHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  }
};
