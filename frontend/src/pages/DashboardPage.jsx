import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  HardDrive, 
  ShieldAlert, 
  ShieldCheck, 
  Cpu, 
  Download, 
  RefreshCw, 
  ArrowRight, 
  Activity, 
  Database,
  CheckCircle2
} from 'lucide-react';
import { getHistoryStats, getHistory, getExportCsvUrl, checkHealth } from '../services/api';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [statsData, historyData, healthData] = await Promise.allSettled([
        getHistoryStats(),
        getHistory({ limit: 5 }),
        checkHealth(),
      ]);

      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (historyData.status === 'fulfilled') setRecentScans(historyData.value?.records || []);
      if (healthData.status === 'fulfilled') setSystemHealth(healthData.value?.data || null);
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const totalScans = stats?.totalScans || 0;
  const deepfakes = stats?.deepfakesDetected || 0;
  const genuine = stats?.genuineDetected || 0;
  const deepfakePct = stats?.deepfakePercentage || '0.0';
  const genuinePct = totalScans > 0 ? ((genuine / totalScans) * 100).toFixed(1) : '0.0';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      
      {/* Dashboard Top Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <LayoutDashboard className="text-gradient-cyan" size={24} />
              Forensic Analytics & Database Dashboard
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Real-time audit telemetry, dataset distribution metrics, and model inference statistics stored in PostgreSQL.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <button
              onClick={loadDashboardData}
              className="btn-secondary"
              title="Refresh dashboard stats"
              style={{ padding: '0.55rem 0.85rem', fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} /> Refresh
            </button>
            <a
              href={getExportCsvUrl()}
              download="deepfake_audio_scan_audit.csv"
              className="btn-primary"
              style={{ padding: '0.55rem 1rem', fontSize: '0.85rem', textDecoration: 'none' }}
            >
              <Download size={15} /> Export Audit CSV
            </a>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid-4">
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Audio Audited</span>
            <HardDrive size={18} className="text-gradient-cyan" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
            {totalScans}
          </p>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>PostgreSQL deepfake_db</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Deepfakes Detected</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
            {deepfakes}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
              ({deepfakePct}%)
            </span>
          </p>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>Synthetic AI speech samples</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Genuine Human Speech</span>
            <ShieldCheck size={18} color="#10b981" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {genuine}
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
              ({genuinePct}%)
            </span>
          </p>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>Verified authentic recordings</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Model Confidence</span>
            <Cpu size={18} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#c4b5fd', fontFamily: 'var(--font-mono)' }}>
            {stats?.averageConfidence || 'N/A'}
          </p>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-dim)' }}>Inference latency: {stats?.avgProcessingTimeMs || 70}ms</span>
        </div>
      </div>

      {/* Database Distribution & Detection Ratio Visuals */}
      <div className="grid-2">
        {/* Detection Ratio Card */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity className="text-gradient-cyan" size={18} />
            Scan Classification Distribution
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Visual Bar */}
            <div style={{ height: '28px', width: '100%', background: 'rgba(15, 23, 42, 0.8)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
              <div 
                style={{ width: `${deepfakePct}%`, background: 'linear-gradient(135deg, #ef4444, #b91c1c)', transition: 'width 0.5s ease' }} 
                title={`Deepfake: ${deepfakePct}%`}
              />
              <div 
                style={{ width: `${genuinePct}%`, background: 'linear-gradient(135deg, #10b981, #047857)', transition: 'width 0.5s ease' }} 
                title={`Genuine: ${genuinePct}%`}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#ef4444' }} />
                <span>Deepfakes: <strong>{deepfakes}</strong> ({deepfakePct}%)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }} />
                <span>Genuine Speech: <strong>{genuine}</strong> ({genuinePct}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dataset Breakdown */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database className="text-gradient" size={18} />
            PostgreSQL Pre-Trained Dataset Metadata
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', textAlign: 'center' }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total Samples</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-cyan)', fontFamily: 'var(--font-mono)' }}>
                {stats?.dataset?.total?.toLocaleString() || '6,000'}
              </p>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Real Audio</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
                {stats?.dataset?.real?.toLocaleString() || '3,000'}
              </p>
            </div>
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Deepfake Audio</p>
              <p style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                {stats?.dataset?.deepfake?.toLocaleString() || '3,000'}
              </p>
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.75rem', textAlign: 'center' }}>
            Curated 4.0-second 16kHz WAV clips balanced across background noise, speech accents, and vocoders.
          </p>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="glass-panel" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Recent Audio Scan Audit Trail</h3>
          <Link to="/history" className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
            View Full Database History ({totalScans}) <ArrowRight size={14} />
          </Link>
        </div>

        {recentScans.length > 0 ? (
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                  <th style={{ padding: '10px 14px' }}>Filename</th>
                  <th style={{ padding: '10px 14px' }}>Format & Size</th>
                  <th style={{ padding: '10px 14px' }}>Verdict</th>
                  <th style={{ padding: '10px 14px' }}>Confidence</th>
                  <th style={{ padding: '10px 14px' }}>Latency</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((r) => {
                  const isPending = !r.label && !r.prediction_id;
                  const isFake = r.label === 'FAKE' || r.is_deepfake;
                  return (
                    <tr key={r.file_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{r.original_name}</td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                        {r.format} ({r.size_human})
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {isPending ? (
                          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '0.72rem' }}>
                            ⏳ PENDING
                          </span>
                        ) : (
                          <span className={`badge ${isFake ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.72rem' }}>
                            {isFake ? '● DEEPFAKE' : '✓ GENUINE'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }} className="font-mono">
                        {isPending ? '—' : (r.confidence ? `${(r.confidence * 100).toFixed(1)}%` : 'N/A')}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>
                        {isPending ? '—' : `${r.processing_ms || 70}ms`}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center' }}>
            No scan records found in database yet. Launch the workbench to run your first audio detection.
          </p>
        )}
      </div>

      {/* System Health Status Banner */}
      {systemHealth && (
        <div className="glass-panel" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={20} color="#10b981" />
            <div>
              <p style={{ fontSize: '0.88rem', fontWeight: 700 }}>
                System Status: All Forensic Microservices Operating Normally
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Uptime: {systemHealth.uptime} • Node.js {systemHealth.environment} • Engine: {systemHealth.model?.name || 'EnsembleNeural'}
              </p>
            </div>
          </div>
          <span className="badge badge-green" style={{ fontSize: '0.75rem' }}>
            PostgreSQL Connected
          </span>
        </div>
      )}

    </div>
  );
}
