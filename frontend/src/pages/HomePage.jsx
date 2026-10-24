import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  BarChart2,
  Activity,
  Cpu,
  History,
  ArrowRight,
  Play,
  Waves,
  Mic,
  Sliders,
  Sparkles
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="home-container">
      {/* 1. HERO SECTION */}
      <section className="hero-section-premium">
        {/* Subtle decorative glow spots */}
        <div className="hero-glow-cyan" aria-hidden="true" />
        <div className="hero-glow-purple" aria-hidden="true" />

        <div className="hero-content">
          <div className="hero-pill-badge">
            <Sparkles size={14} className="pulse-glow" />
            <span>Forensic Acoustic Intelligence</span>
          </div>

          <h1 className="hero-headline">
            <span className="text-gradient">DeepFake Audio Analyzer</span>
          </h1>

          <p className="hero-subheadline">
            Deepfake Audio Detection &amp; Forensic Spectral Analyzer
          </p>

          <p className="hero-description">
            Analyze audio for deepfake detection using audio signal processing, machine learning, and forensic spectral analysis.
          </p>

          {/* Three Main Action Buttons */}
          <div className="hero-action-buttons">
            <Link to="/workbench" className="btn-primary hero-btn-main">
              <ShieldCheck size={18} />
              <span>Launch Detection Workbench</span>
              <ArrowRight size={16} />
            </Link>

            <Link to="/forensics" className="btn-secondary hero-btn-alt">
              <BarChart2 size={18} />
              <span>Spectral Analyzer</span>
            </Link>

            <Link to="/dashboard" className="btn-secondary hero-btn-alt">
              <Activity size={18} />
              <span>Live Database Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Audio Waveform & Spectrogram Visualizer */}
        <div className="hero-visual-card">
          <div className="hero-visual-inner">
            <div className="hero-visual-header">
              <div className="hero-visual-status">
                <span className="visual-indicator-dot" />
                <span className="visual-indicator-text">Forensic Acoustic Spectrum (16kHz Mono)</span>
              </div>
              <div className="hero-visual-tags">
                <span className="badge badge-cyan" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                  128-Band Mel
                </span>
                <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem' }}>
                  STFT Spectrogram
                </span>
              </div>
            </div>

            {/* Stylized Spectrogram & Waveform Canvas Graphic */}
            <div className="hero-spectrogram-display">
              <div className="spectrogram-mesh" aria-hidden="true">
                {/* Horizontal frequency grid lines */}
                <div className="freq-grid-line" style={{ top: '15%' }}><span>8000 Hz</span></div>
                <div className="freq-grid-line" style={{ top: '40%' }}><span>4000 Hz</span></div>
                <div className="freq-grid-line" style={{ top: '65%' }}><span>1000 Hz</span></div>
                <div className="freq-grid-line" style={{ top: '90%' }}><span>100 Hz</span></div>
              </div>

              {/* Dynamic Waveform Bars */}
              <div className="hero-waveform-bars" aria-hidden="true">
                {[
                  32, 54, 78, 45, 88, 92, 60, 42, 70, 85,
                  95, 65, 48, 82, 90, 74, 52, 68, 86, 94,
                  58, 38, 72, 84, 91, 63, 49, 77, 89, 56,
                  34, 62, 80, 47, 90, 87, 59, 44, 73, 85,
                  96, 68, 50, 83, 92, 71, 55, 66, 88, 40
                ].map((height, idx) => (
                  <span
                    key={idx}
                    className="hero-wave-bar"
                    style={{
                      height: `${height}%`,
                      animationDelay: `${(idx % 12) * 0.1}s`
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="hero-visual-footer">
              <div className="hero-visual-metric">
                <span className="metric-label">Signal Sampling</span>
                <span className="metric-val">16,000 Hz PCM</span>
              </div>
              <div className="hero-visual-metric">
                <span className="metric-label">Feature Vector</span>
                <span className="metric-val">170 Acoustic Dimensions</span>
              </div>
              <div className="hero-visual-metric">
                <span className="metric-label">Spectral Resolution</span>
                <span className="metric-val">2048 FFT / 512 Hop</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FOUR CONSISTENT FEATURE CARDS */}
      <section className="feature-cards-section">
        <div className="section-title-wrapper">
          <h2 className="section-title">Core Detection Architecture</h2>
          <p className="section-subtitle">
            Specialized forensic instruments for detecting synthetic voice cloning and neural speech generation.
          </p>
        </div>

        <div className="grid-4 feature-grid">
          {/* Card 1: AI-Powered Detection */}
          <div className="feature-card-item">
            <div className="feature-card-icon" style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}>
              <Cpu size={24} />
            </div>
            <h3 className="feature-card-title">AI-Powered Detection</h3>
            <p className="feature-card-desc">
              Multi-classifier machine learning ensemble evaluating vocal pitch stability, spectral flux, and synthetic artifact signatures.
            </p>
            <Link to="/workbench" className="feature-card-action">
              <span>Open Workbench</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 2: Spectral Analysis */}
          <div className="feature-card-item">
            <div className="feature-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
              <BarChart2 size={24} />
            </div>
            <h3 className="feature-card-title">Spectral Analysis</h3>
            <p className="feature-card-desc">
              High-resolution 128-band Mel spectrograms and linear STFT time-frequency heatmaps uncovering unnatural robotic frequency cutoffs.
            </p>
            <Link to="/forensics" className="feature-card-action">
              <span>View Spectrograms</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 3: Forensic Tools */}
          <div className="feature-card-item">
            <div className="feature-card-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
              <Sliders size={24} />
            </div>
            <h3 className="feature-card-title">Forensic Tools</h3>
            <p className="feature-card-desc">
              170-dimensional acoustic feature extraction pipeline, real-time microphone recorder, and verifiable forensic audit certificates.
            </p>
            <Link to="/models" className="feature-card-action">
              <span>Explore Tools</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Card 4: Analysis History */}
          <div className="feature-card-item">
            <div className="feature-card-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
              <History size={24} />
            </div>
            <h3 className="feature-card-title">Analysis History</h3>
            <p className="feature-card-desc">
              Structured audit log storing audio forensic telemetry, classification verdicts, and metadata in a persistent database.
            </p>
            <Link to="/history" className="feature-card-action">
              <span>Inspect History</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FORENSIC PIPELINE WORKFLOW OVERVIEW */}
      <section className="pipeline-overview-section glass-panel">
        <div className="pipeline-header">
          <h2 className="pipeline-title">Detection Lifecycle</h2>
          <p className="pipeline-subtitle">
            From raw acoustic ingestion to forensic classification verdict
          </p>
        </div>

        <div className="pipeline-steps-grid">
          <div className="pipeline-step-item">
            <div className="step-tag tag-cyan">STEP 01</div>
            <div className="step-icon-row">
              <Mic size={18} className="text-gradient-cyan" />
              <h4 className="step-heading">Audio Ingestion</h4>
            </div>
            <p className="step-desc">
              Upload WAV, MP3, FLAC, OGG audio or capture directly using the low-latency microphone recorder.
            </p>
          </div>

          <div className="pipeline-step-item">
            <div className="step-tag tag-green">STEP 02</div>
            <div className="step-icon-row">
              <Waves size={18} style={{ color: '#34d399' }} />
              <h4 className="step-heading">Signal Normalization</h4>
            </div>
            <p className="step-desc">
              Resamples to 16kHz Mono PCM, trims non-vocal silence, and applies amplitude peak normalization.
            </p>
          </div>

          <div className="pipeline-step-item">
            <div className="step-tag tag-purple">STEP 03</div>
            <div className="step-icon-row">
              <BarChart2 size={18} style={{ color: '#c4b5fd' }} />
              <h4 className="step-heading">Feature Extraction</h4>
            </div>
            <p className="step-desc">
              Extracts 170 acoustic dimensions: 20-band MFCCs, Chroma pitch stability, and spectral contrast heatmaps.
            </p>
          </div>

          <div className="pipeline-step-item">
            <div className="step-tag tag-amber">STEP 04</div>
            <div className="step-icon-row">
              <Cpu size={18} style={{ color: '#f59e0b' }} />
              <h4 className="step-heading">Ensemble Inference</h4>
            </div>
            <p className="step-desc">
              Evaluates calibrated ensemble model to calculate deepfake probability and logs results to audit history.
            </p>
          </div>
        </div>
      </section>

      {/* 4. WORKBENCH CALL TO ACTION */}
      <section className="cta-banner">
        <h2 className="cta-title">Ready to Analyze an Audio Recording?</h2>
        <p className="cta-desc">
          Upload suspect speech or select benchmark samples in the detection workbench to inspect acoustic anomalies.
        </p>
        <Link to="/workbench" className="btn-primary cta-btn">
          <Play size={16} />
          <span>Open Detection Workbench</span>
        </Link>
      </section>
    </div>
  );
}
