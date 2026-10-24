import React, { useState, useEffect, useCallback } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  FileText, 
  Download, 
  RefreshCw, 
  ShieldCheck, 
  ShieldAlert, 
  HardDrive,
  Cpu
} from 'lucide-react';
import { getHistory, getHistoryStats, deleteHistoryItem, getExportCsvUrl } from '../services/api';

export default function AnalysisHistory({ onSelectReport }) {
  const [historyRecords, setHistoryRecords] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [verdictFilter, setVerdictFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async (page = 1) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await getHistory({
        page,
        limit: 8,
        search: searchTerm,
        verdict: verdictFilter,
      });
      setHistoryRecords(data.records || []);
      setPagination(data.pagination || { currentPage: page, totalPages: 1, totalRecords: data.records?.length || 0 });
    } catch (err) {
      console.error('Failed to load history:', err);
      setErrorMsg('Could not connect to database history. Verify PostgreSQL connection.');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, verdictFilter]);

  const loadStats = useCallback(async () => {
    try {
      const s = await getHistoryStats();
      setStats(s);
    } catch (err) {
      console.warn('Could not fetch history stats:', err);
    }
  }, []);

  useEffect(() => {
    loadData(1);
    loadStats();
  }, [loadData, loadStats]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData(1);
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm(`Are you sure you want to delete this scan record (${fileId.slice(0, 8)}...)?`)) {
      return;
    }
    setDeletingId(fileId);
    try {
      await deleteHistoryItem(fileId);
      await loadData(pagination.currentPage);
      await loadStats();
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewReport = (record) => {
    if (!onSelectReport) return;
    const fileRecord = {
      fileId: record.file_id,
      originalName: record.original_name,
      format: record.format,
      sizeHuman: record.size_human,
      uploadedAt: record.created_at,
    };
    const analysisResult = {
      isDeepfake: record.is_deepfake,
      label: record.label,
      confidence: record.confidence,
      fakeProbability: record.fake_probability,
      realProbability: record.real_probability,
      modelName: record.model_name,
      modelType: record.model_type,
      processingMs: record.processing_ms,
    };
    const preprocessingData = {
      featuresSummary: record.features_summary || {},
      samplingRateHz: 16000,
      cleanDurationSec: '4.00',
    };
    onSelectReport({ fileRecord, analysisResult, preprocessingData });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
      
      {/* 1. PostgreSQL Database & Analytics Stats Cards */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Audio Files</span>
            <HardDrive size={18} className="text-gradient-cyan" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {stats?.totalAudioFiles ?? pagination.totalRecords ?? stats?.totalScans ?? 0}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {stats?.totalScans ?? 0} analyzed • {stats?.pendingScans ?? 0} pending
          </span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Deepfakes Detected</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
            {stats?.deepfakesDetected ?? 0}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
              ({stats?.deepfakePercentage ?? 0}%)
            </span>
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Synthetic AI speech audio files</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Genuine Human Voices</span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {stats?.genuineDetected ?? 0}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Authentic human speech samples</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Model Confidence</span>
            <Cpu size={18} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.6rem', fontWeight: 800, color: '#c4b5fd', fontFamily: 'var(--font-mono)' }}>
            {stats?.averageConfidence ?? 'N/A'}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Avg speed: {stats?.avgProcessingTimeMs ?? 0}ms</span>
        </div>
      </div>

      {/* Dataset Metadata Integration Statistics */}
      {stats?.dataset && (
        <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #38bdf8' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Integrated Dataset</span>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#38bdf8' }}>
              {stats.dataset.total?.toLocaleString() || '6,000'} WAV Files
            </p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Metadata in PostgreSQL dataset_files</span>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #10b981' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Real Voice Dataset</span>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#34d399' }}>
              {stats.dataset.real?.toLocaleString() || '3,000'} Files
            </p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>1,000 balanced • 1,000 bg • 1,000 voice</span>
          </div>
          <div className="glass-panel" style={{ padding: '1rem', borderLeft: '4px solid #ef4444' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Deepfake Voice Dataset</span>
            <p style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: '#f87171' }}>
              {stats.dataset.deepfake?.toLocaleString() || '3,000'} Files
            </p>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>1,000 balanced • 1,000 bg • 1,000 voice</span>
          </div>
        </div>
      )}

      {/* 2. Control Toolbar (Search, Filter, Export) */}
      <div className="glass-panel" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1 1 280px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search by audio filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem 0.55rem 2.25rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid var(--border-glass)',
                  color: 'white',
                  fontSize: '0.85rem'
                }}
              />
            </div>
            <button type="submit" className="btn-secondary" style={{ padding: '0.55rem 0.9rem', fontSize: '0.85rem' }}>
              Search
            </button>
          </form>

          {/* Verdict Filter Buttons & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
              {['ALL', 'REAL', 'FAKE', 'PENDING'].map((v) => (
                <button
                  key={v}
                  onClick={() => setVerdictFilter(v)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: verdictFilter === v ? 'linear-gradient(135deg, #38bdf8, #8b5cf6)' : 'transparent',
                    color: verdictFilter === v ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.2s'
                  }}
                >
                  {v === 'ALL' ? 'All Files' : v === 'REAL' ? 'Real Only' : v === 'FAKE' ? 'Fake Only' : 'Pending'}
                </button>
              ))}
            </div>

            <button
              onClick={() => { loadData(pagination.currentPage); loadStats(); }}
              className="btn-secondary"
              title="Refresh database records"
              style={{ padding: '0.55rem 0.75rem' }}
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
            </button>

            <a
              href={getExportCsvUrl()}
              download="deepfake_audio_scan_audit.csv"
              className="btn-primary"
              style={{ padding: '0.55rem 0.9rem', fontSize: '0.82rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Download size={15} /> Export CSV
            </a>
          </div>
        </div>

        {errorMsg && (
          <p style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.75rem' }}>{errorMsg}</p>
        )}
      </div>

      {/* 3. History Records Table */}
      <div className="glass-panel" style={{ padding: '1rem', overflowX: 'auto' }}>
        {historyRecords.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <History size={40} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>No Analysis Records Found</p>
            <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>
              Upload and analyze an audio file in the Detection Workbench to record audit history.
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '10px 14px' }}>Audio Filename</th>
                <th style={{ padding: '10px 14px' }}>Verdict</th>
                <th style={{ padding: '10px 14px' }}>Certainty</th>
                <th style={{ padding: '10px 14px' }}>Probabilities</th>
                <th style={{ padding: '10px 14px' }}>Model</th>
                <th style={{ padding: '10px 14px' }}>Date</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {historyRecords.map((r) => {
                const isPending = !r.label && !r.prediction_id;
                const isFake = r.label === 'FAKE' || r.is_deepfake;
                const confPct = ((r.confidence || 0) * 100).toFixed(1);
                const fakePct = ((r.fake_probability || 0) * 100).toFixed(1);
                const realPct = ((r.real_probability || 0) * 100).toFixed(1);

                return (
                  <tr key={r.file_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', transition: 'background 0.2s' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <p style={{ fontWeight: 600, color: '#f8fafc' }}>{r.original_name}</p>
                      <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {r.format?.toUpperCase()} • {r.size_human} • {r.file_id?.slice(0, 8)}...
                      </p>
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {isPending ? (
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700, fontSize: '0.72rem' }}>
                          AWAITING SCAN
                        </span>
                      ) : (
                        <span className={`badge ${isFake ? 'badge-red' : 'badge-green'}`} style={{ fontWeight: 700, fontSize: '0.75rem' }}>
                          {isFake ? 'DEEPFAKE' : 'REAL VOICE'}
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {isPending ? (
                        <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>—</span>
                      ) : (
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: isFake ? '#f87171' : '#34d399' }}>
                          {confPct}%
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      {isPending ? (
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Not analyzed yet</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.72rem', fontFamily: 'var(--font-mono)' }}>
                          <span style={{ color: '#34d399' }}>Real: {realPct}%</span>
                          <span style={{ color: '#f87171' }}>Fake: {fakePct}%</span>
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {isPending ? 'Pending' : (r.model_name || 'EnsembleNeural')}
                      </span>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {isPending ? '—' : `${r.processing_ms || 70}ms`}
                      </p>
                    </td>

                    <td style={{ padding: '12px 14px', color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                      {new Date(r.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleViewReport(r)}
                          className="btn-secondary"
                          title="View Forensic Report"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <FileText size={14} /> Report
                        </button>

                        <button
                          onClick={() => handleDelete(r.file_id)}
                          disabled={deletingId === r.file_id}
                          className="btn-danger"
                          title="Delete from PostgreSQL"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '1rem', marginTop: '1rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalRecords} total records)
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                disabled={!pagination.hasPrevPage || isLoading}
                onClick={() => loadData(pagination.currentPage - 1)}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                Previous
              </button>
              <button
                disabled={!pagination.hasNextPage || isLoading}
                onClick={() => loadData(pagination.currentPage + 1)}
                className="btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
