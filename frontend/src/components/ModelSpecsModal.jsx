import React from 'react';
import { Cpu, CheckCircle2, ShieldCheck, Zap, Layers, BarChart3, Database, Award } from 'lucide-react';

export default function ModelSpecsModal({ modelInfo }) {
  const metrics = modelInfo?.metrics || {
    accuracy: 0.7300,
    precision: 0.7347,
    recall: 0.7200,
    f1Score: 0.7273,
    rocAuc: 0.7790,
  };

  const trainingSamples = modelInfo?.trainingSamples || 1198;
  const testSamples = modelInfo?.testSamples || 300;
  const totalSamples = trainingSamples + testSamples;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.25rem' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white'
          }}>
            <Cpu size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>AI Machine Learning Architecture & Benchmark Metrics</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Deepfake Audio Detection & Forensic Feature Engine Specifications
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          {modelInfo?.note || 'Active trained classifier: Ensemble HistGradientBoosting + Random Forest + Extra Trees (Trained on 1,500 audio samples).'}
        </p>
      </div>

      {/* Model Benchmark Performance Cards */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #10b981' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Test Accuracy</span>
            <Award size={18} color="#10b981" />
          </div>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#34d399', fontFamily: 'var(--font-mono)' }}>
            {(metrics.accuracy * 100).toFixed(1)}%
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Out-of-sample holdout test</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary-cyan)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ROC-AUC Metric</span>
            <BarChart3 size={18} className="text-gradient-cyan" />
          </div>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
            {metrics.rocAuc?.toFixed(3) || '0.779'}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Area under receiver operating curve</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>F1-Score / Recall</span>
            <ShieldCheck size={18} color="#8b5cf6" />
          </div>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#c4b5fd', fontFamily: 'var(--font-mono)' }}>
            {(metrics.f1Score * 100).toFixed(1)}%
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Precision: {(metrics.precision * 100).toFixed(1)}% • Recall: {(metrics.recall * 100).toFixed(1)}%</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Training Dataset</span>
            <Database size={18} color="#f59e0b" />
          </div>
          <p style={{ fontSize: '1.7rem', fontWeight: 800, color: '#fbbf24', fontFamily: 'var(--font-mono)' }}>
            {totalSamples}
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>4.0s WAV audio clips (Balanced)</span>
        </div>
      </div>

      {/* Architecture Detail Cards */}
      <div className="grid-2" style={{ gap: '1.25rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary-cyan)' }}>
            <Layers size={18} /> Signal Preprocessing Pipeline
          </h4>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', paddingLeft: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#38bdf8" /> <strong>Sampling Rate:</strong> Resampled to 16,000 Hz Mono Clean PCM
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#38bdf8" /> <strong>Vocal Trimming:</strong> TopDB 20dB silence removal and boundary cropping
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#38bdf8" /> <strong>Normalization:</strong> Peak Amplitude Normalization to [-1.0, 1.0]
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#38bdf8" /> <strong>STFT Framing:</strong> 25ms FFT window size (N_FFT=512, Hop=256)
            </li>
          </ul>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c4b5fd' }}>
            <Zap size={18} /> Acoustic Feature Extractor (170 Dimensions)
          </h4>
          <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.6rem', listStyle: 'none', paddingLeft: 0 }}>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#c4b5fd" /> <strong>MFCCs (120 dims):</strong> 20 Coefficients (mean, std, min, max, delta, delta2)
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#c4b5fd" /> <strong>Chroma STFT (24 dims):</strong> 12 pitch chroma bands (mean, std)
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#c4b5fd" /> <strong>Spectral Contrast (14 dims):</strong> 7 octave sub-bands (mean, std)
            </li>
            <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={15} color="#c4b5fd" /> <strong>Temporal Metrics (12 dims):</strong> ZCR, RMS Energy, Spectral Centroid stats
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}
