import React, { useState } from 'react';
import AnalysisHistory from '../components/AnalysisHistory';
import ForensicReportModal from '../components/ForensicReportModal';
import { History, Download } from 'lucide-react';
import { getExportCsvUrl } from '../services/api';

export default function HistoryPage() {
  const [selectedReport, setSelectedReport] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const handleSelectReport = ({ fileRecord, analysisResult, preprocessingData }) => {
    setSelectedReport({ fileRecord, analysisResult, preprocessingData });
    setIsReportOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <History className="text-gradient-cyan" size={24} />
              Audio Scan History & Forensic Audit Database
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Complete record of all acoustic scans, confidence percentages, probability scores, and downloadable certificates stored in PostgreSQL.
            </p>
          </div>

          <a
            href={getExportCsvUrl()}
            download="deepfake_audio_scan_audit.csv"
            className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.55rem 1rem', textDecoration: 'none' }}
          >
            <Download size={15} /> Export Complete Audit CSV
          </a>
        </div>
      </div>

      {/* History Component */}
      <AnalysisHistory onSelectReport={handleSelectReport} />

      {/* Forensic Report Modal */}
      {selectedReport && (
        <ForensicReportModal
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          analysisResult={selectedReport.analysisResult}
          fileRecord={selectedReport.fileRecord}
          preprocessingData={selectedReport.preprocessingData}
        />
      )}

    </div>
  );
}
