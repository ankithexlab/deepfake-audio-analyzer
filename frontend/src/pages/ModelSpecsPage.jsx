import React, { useState, useEffect } from 'react';
import ModelSpecsModal from '../components/ModelSpecsModal';
import { Cpu, Layers } from 'lucide-react';
import { getModelInfo } from '../services/api';

export default function ModelSpecsPage({ modelInfo: propModelInfo }) {
  const [modelInfo, setModelInfo] = useState(propModelInfo || null);

  useEffect(() => {
    if (!modelInfo) {
      getModelInfo().then(setModelInfo).catch(() => {});
    }
  }, [modelInfo]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Cpu className="text-gradient-cyan" size={24} />
          AI Machine Learning Model Specifications
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Detailed acoustic architecture, feature engineering vector, preprocessing transformations, and holdout benchmark metrics.
        </p>
      </div>

      {/* Model Specs Core View */}
      <ModelSpecsModal modelInfo={modelInfo} />

      {/* Deep Feature Vector Architecture Table */}
      <div className="glass-panel" style={{ padding: '1.75rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Layers className="text-gradient" size={20} />
          170-Dimensional Acoustic Feature Vector Decomposition
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Extracted directly from 16kHz resampled PCM audio frames for input into the ensemble neural classifiers.
        </p>

        <div className="table-responsive">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '10px 14px' }}>Feature Family</th>
                <th style={{ padding: '10px 14px' }}>Dimensions</th>
                <th style={{ padding: '10px 14px' }}>Mathematical Basis</th>
                <th style={{ padding: '10px 14px' }}>Deepfake Sensitivity</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--primary-cyan)' }}>MFCC Cepstrals</td>
                <td style={{ padding: '10px 14px' }} className="font-mono">120 dims</td>
                <td style={{ padding: '10px 14px' }}>20 coefficients &times; 6 stats (mean, std, min, max, delta, delta&sup2;)</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>High (unnatural vocal tract formant shifts)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#c4b5fd' }}>Chroma STFT</td>
                <td style={{ padding: '10px 14px' }} className="font-mono">24 dims</td>
                <td style={{ padding: '10px 14px' }}>12 semi-tone pitch pitch chroma bins &times; 2 stats (mean, std)</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Medium (robotic fundamental pitch flatness)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#34d399' }}>Spectral Contrast</td>
                <td style={{ padding: '10px 14px' }} className="font-mono">14 dims</td>
                <td style={{ padding: '10px 14px' }}>7 octave sub-bands &times; 2 stats (mean, std)</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>High (vocoder harmonic compression)</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#fbbf24' }}>Temporal Metrics</td>
                <td style={{ padding: '10px 14px' }} className="font-mono">12 dims</td>
                <td style={{ padding: '10px 14px' }}>RMS Energy, Zero Crossing Rate (ZCR), Spectral Centroid, Rolloff</td>
                <td style={{ padding: '10px 14px', color: 'var(--text-muted)' }}>Critical (synthesis unvoiced boundary noise)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
