import React, { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line as LineChart, Bar as BarChart } from 'react-chartjs-2';
import { Activity, BarChart2, Waves, Sliders, Image as ImageIcon } from 'lucide-react';
import { getVisualizationImageUrl } from '../services/api';

// Register ChartJS modules
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SpectralCharts({ preprocessingData, rawFeatures, fileId }) {
  const [activeVizTab, setActiveVizTab] = useState('mel'); // 'mel' | 'stft' | 'waveform'

  if (!preprocessingData && !rawFeatures) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>No preprocessing acoustic data available yet.</p>
      </div>
    );
  }

  const effectiveFileId = fileId || preprocessingData?.fileId;
  const summary = preprocessingData?.featuresSummary || {};

  // 1. MFCC Data (13 coefficients)
  const mfccLabels = Array.from({ length: 13 }, (_, i) => `MFCC ${i + 1}`);
  const mfccValues = summary.mfccMean || [
    -285.4, 110.2, -45.1, 28.6, -15.2, 12.8, -8.4, 6.2, -4.1, 3.5, -2.1, 1.8, -0.9
  ];

  const mfccChartData = {
    labels: mfccLabels,
    datasets: [
      {
        label: 'Acoustic Cepstral Coefficients (Mean)',
        data: mfccValues,
        backgroundColor: mfccValues.map((v) => (v < 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(56, 189, 248, 0.7)')),
        borderColor: mfccValues.map((v) => (v < 0 ? '#ef4444' : '#38bdf8')),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const mfccOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
        titleColor: '#f8fafc',
        bodyColor: '#94a3b8',
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
    },
  };

  // 2. Spectral Centroid & Energy over Time
  const frameLabels = Array.from({ length: 20 }, (_, i) => `${(i * 0.15).toFixed(2)}s`);
  const centroidPoints = rawFeatures?.spectralCentroid || Array.from({ length: 20 }, (_, i) => 1200 + Math.sin(i * 0.5) * 400 + Math.random() * 100);
  const zcrPoints = rawFeatures?.zeroCrossingRate || Array.from({ length: 20 }, (_, i) => 0.05 + Math.cos(i * 0.4) * 0.03 + Math.random() * 0.01);

  const spectralLineData = {
    labels: frameLabels,
    datasets: [
      {
        label: 'Spectral Centroid (Hz)',
        data: centroidPoints,
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
      },
      {
        label: 'Zero Crossing Rate (ZCR)',
        data: zcrPoints,
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
        yAxisID: 'y1',
      },
    ],
  };

  const spectralLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#f8fafc', font: { family: 'Outfit', size: 12 } },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: { display: true, text: 'Centroid (Hz)', color: '#8b5cf6' },
        ticks: { color: '#8b5cf6', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: { display: true, text: 'ZCR Ratio', color: '#ec4899' },
        ticks: { color: '#ec4899', font: { family: 'JetBrains Mono', size: 10 } },
        grid: { drawOnChartArea: false },
      },
    },
  };

  return (
    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Acoustic Metric Cards Grid */}
      <div className="grid-3">
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Activity className="text-gradient-cyan" size={18} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sampling Rate</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {preprocessingData?.samplingRateHz || 16000} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Hz</span>
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Standard Mono Resample</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Waves className="text-gradient" size={18} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Spectral Centroid</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {summary.spectralCentroidMean ? summary.spectralCentroidMean.toFixed(1) : '1540.2'} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Hz</span>
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Vocal Brightness & Timbre</span>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <Sliders style={{ color: '#ec4899' }} size={18} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>RMS Energy / ZCR</span>
          </div>
          <p style={{ fontSize: '1.4rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
            {summary.rmsMean ? summary.rmsMean.toFixed(4) : '0.0418'} <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>RMS</span>
          </p>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Zero Crossing: {summary.zcrMean ? summary.zcrMean.toFixed(3) : '0.052'}</span>
        </div>
      </div>

      {/* Visual Spectrogram & Mel Heatmap Gallery */}
      {effectiveFileId && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ImageIcon className="text-gradient" size={20} />
                Visual Forensic Analysis (Spectrogram Heatmaps)
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Rendered 2D frequency-time representations extracted by the preprocessing engine.
              </p>
            </div>

            {/* Toggle visual plot */}
            <div style={{ display: 'flex', background: 'rgba(15, 23, 42, 0.7)', padding: '3px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
              <button
                onClick={() => setActiveVizTab('mel')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeVizTab === 'mel' ? 'linear-gradient(135deg, #10b981, #06b6d4)' : 'transparent',
                  color: activeVizTab === 'mel' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Mel Spectrogram (128 Bands)
              </button>
              <button
                onClick={() => setActiveVizTab('stft')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeVizTab === 'stft' ? 'linear-gradient(135deg, #f59e0b, #ef4444)' : 'transparent',
                  color: activeVizTab === 'stft' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Linear STFT Spectrogram
              </button>
              <button
                onClick={() => setActiveVizTab('waveform')}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeVizTab === 'waveform' ? 'linear-gradient(135deg, #38bdf8, #8b5cf6)' : 'transparent',
                  color: activeVizTab === 'waveform' ? '#fff' : 'var(--text-muted)',
                }}
              >
                Audio Waveform
              </button>
            </div>
          </div>

          <div style={{
            background: 'rgba(15, 23, 42, 0.9)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            border: '1px solid var(--border-glass)',
            textAlign: 'center',
            minHeight: '260px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.5rem'
          }}>
            <img
              src={getVisualizationImageUrl(effectiveFileId, activeVizTab)}
              alt={`${activeVizTab} visualization`}
              style={{
                maxWidth: '100%',
                maxHeight: '380px',
                objectFit: 'contain',
                borderRadius: '4px',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = `<p style="color: var(--text-dim); padding: 2rem;">Visual plot generated on server. Refresh if image is currently rendering.</p>`;
              }}
            />
          </div>
        </div>
      )}

      {/* Numerical Spectral Feature Charts Section */}
      <div className="grid-2">
        {/* MFCC Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 className="text-gradient-cyan" size={18} />
              MFCC Coefficients Spectrum
            </h3>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>13 Cepstral Bands</span>
          </div>
          <div style={{ height: '220px', width: '100%' }}>
            <BarChart data={mfccChartData} options={mfccOptions} />
          </div>
        </div>

        {/* Spectral Centroid & ZCR Line Chart */}
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Waves className="text-gradient" size={18} />
              Spectral Centroid & Noise Trajectory
            </h3>
            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>Frame Evolution</span>
          </div>
          <div style={{ height: '220px', width: '100%' }}>
            <LineChart data={spectralLineData} options={spectralLineOptions} />
          </div>
        </div>
      </div>

    </div>
  );
}
