import React from 'react';
import { api } from '../api/client';
import { Language } from '../i18n/translations';
import { X, Download, Printer, FileText, ExternalLink } from 'lucide-react';

interface ReportPreviewModalProps {
  caseId: string;
  lang: Language;
  onClose: () => void;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  caseId,
  lang,
  onClose,
}) => {
  const reportUrl = api.getReportUrl(caseId, lang);
  const autoPrintUrl = `${reportUrl}&print=true`;

  const handlePrint = () => {
    // Open in separate window to bypass cross-origin iframe print sandbox
    window.open(autoPrintUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-clinical-950/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
      
      <div className="bg-white w-full max-w-4xl h-[90vh] rounded-2xl shadow-2xl border border-clinical-200 flex flex-col overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-clinical-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-medical-light text-medical flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-clinical-900">
                Clinical Diagnostic Diagnostic Report
              </h3>
              <p className="text-[11px] font-mono text-clinical-500">
                A4 Tele-health Sign-off · Study ID: <span className="font-bold text-clinical-800">{caseId.slice(0, 13)}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Direct Native Print / PDF Trigger */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-medical hover:bg-medical-hover text-white text-xs font-semibold shadow-sm transition-all"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={() => window.open(reportUrl, '_blank')}
              className="p-2 rounded-lg border border-clinical-200 hover:bg-clinical-50 text-clinical-600 transition-colors"
              title="Open in New Tab"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-clinical-400 hover:text-clinical-800 hover:bg-clinical-100 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Iframe Content */}
        <div className="flex-1 bg-clinical-100/70 p-2 sm:p-4 overflow-hidden flex items-center justify-center">
          <iframe
            id="report-iframe"
            src={reportUrl}
            title="Diagnostic Report"
            className="w-full h-full bg-white rounded-xl shadow-md border border-clinical-200"
          />
        </div>

      </div>

    </div>
  );
};
