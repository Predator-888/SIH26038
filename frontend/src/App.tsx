import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { RoleSelectorView } from './views/RoleSelectorView';
import { FieldWorkerCaptureView } from './views/FieldWorkerCaptureView';
import { QualityFeedbackView } from './views/QualityFeedbackView';
import { ProcessingView } from './views/ProcessingView';
import { CaseResultView } from './views/CaseResultView';
import { ReviewerQueueView } from './views/ReviewerQueueView';
import { CaseDetailReviewView } from './views/CaseDetailReviewView';
import { SimulationDashboardView } from './views/SimulationDashboardView';
import { ReportPreviewModal } from './views/ReportPreviewModal';
import { CaseUploadResponse, CaseResult } from './types/api';
import { Language } from './i18n/translations';

type ViewMode = 
  | 'role_select'
  | 'field_capture'
  | 'quality_feedback'
  | 'processing'
  | 'case_result'
  | 'reviewer_queue'
  | 'case_detail_review'
  | 'simulation_dashboard';

export const App: React.FC = () => {
  const [lang, setLang] = useState<Language>('en');
  const [currentRole, setCurrentRole] = useState<'field' | 'reviewer' | 'admin' | null>(null);
  const [view, setView] = useState<ViewMode>('role_select');

  // State across flow
  const [activeUpload, setActiveUpload] = useState<CaseUploadResponse | null>(null);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [activeCaseResult, setActiveCaseResult] = useState<CaseResult | null>(null);
  const [selectedCaseIdForReview, setSelectedCaseIdForReview] = useState<string | null>(null);
  const [reportModalCaseId, setReportModalCaseId] = useState<string | null>(null);

  const handleSelectRole = (role: 'field' | 'reviewer' | 'admin' | null) => {
    setCurrentRole(role);
    if (!role) {
      setView('role_select');
    } else if (role === 'field') {
      setView('field_capture');
    } else if (role === 'reviewer') {
      setView('reviewer_queue');
    } else if (role === 'admin') {
      setView('simulation_dashboard');
    }
  };

  const handleUploadSuccess = (uploadData: CaseUploadResponse, file: File) => {
    setActiveUpload(uploadData);
    setActiveFile(file);
    setView('quality_feedback');
  };

  const handleProceedToAnalysis = () => {
    if (activeUpload) {
      setView('processing');
    }
  };

  const handleAnalysisComplete = (result: CaseResult) => {
    setActiveCaseResult(result);
    setView('case_result');
  };

  const handleSelectCaseInQueue = (caseId: string) => {
    setSelectedCaseIdForReview(caseId);
    setView('case_detail_review');
  };

  return (
    <div className="min-h-screen bg-clinical-50 text-clinical-900 flex flex-col font-sans">
      
      {/* Top Universal Navbar */}
      <Navbar
        currentRole={currentRole}
        onSelectRole={handleSelectRole}
        lang={lang}
        onToggleLang={setLang}
      />

      {/* Main Routed View Stage */}
      <main className="flex-1">
        {view === 'role_select' && (
          <RoleSelectorView
            onSelectRole={handleSelectRole}
            lang={lang}
          />
        )}

        {view === 'field_capture' && (
          <FieldWorkerCaptureView
            onUploadSuccess={handleUploadSuccess}
            lang={lang}
          />
        )}

        {view === 'quality_feedback' && activeUpload && activeFile && (
          <QualityFeedbackView
            uploadData={activeUpload}
            file={activeFile}
            onProceed={handleProceedToAnalysis}
            onRetake={() => setView('field_capture')}
            lang={lang}
          />
        )}

        {view === 'processing' && activeUpload && (
          <ProcessingView
            caseId={activeUpload.case_id}
            onComplete={handleAnalysisComplete}
            onError={(msg) => alert(`Analysis error: ${msg}`)}
            lang={lang}
          />
        )}

        {view === 'case_result' && activeCaseResult && (
          <CaseResultView
            result={activeCaseResult}
            onBack={() => setView('field_capture')}
            onOpenReport={(id) => setReportModalCaseId(id)}
            lang={lang}
          />
        )}

        {view === 'reviewer_queue' && (
          <ReviewerQueueView
            onSelectCase={handleSelectCaseInQueue}
            lang={lang}
          />
        )}

        {view === 'case_detail_review' && selectedCaseIdForReview && (
          <CaseDetailReviewView
            caseId={selectedCaseIdForReview}
            onBack={() => setView('reviewer_queue')}
            onOpenReport={(id) => setReportModalCaseId(id)}
            lang={lang}
          />
        )}

        {view === 'simulation_dashboard' && (
          <SimulationDashboardView
            lang={lang}
          />
        )}
      </main>

      {/* Diagnostic Report Preview Modal */}
      {reportModalCaseId && (
        <ReportPreviewModal
          caseId={reportModalCaseId}
          lang={lang}
          onClose={() => setReportModalCaseId(null)}
        />
      )}

      {/* Bottom Enterprise Legal & Compliance Footer */}
      <footer className="bg-white border-t border-clinical-200 py-4 px-4 text-center text-xs text-clinical-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong>NetraAI Enterprise PACS v2.4</strong> · Automated Diagnostic Tele-Ophthalmology Screening Platform · Clinical Decision Support
          </div>
          <div className="font-mono text-[11px] text-clinical-600 font-semibold">
            HIPAA / DPDP Act 2023 Compliant · ICDR Standard
          </div>
        </div>
      </footer>

    </div>
  );
};

export default App;
