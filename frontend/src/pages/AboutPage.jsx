import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Info, Cpu, CheckCircle2, BookOpen } from 'lucide-react';

export default function AboutPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="brand-icon">
            <Info size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>About DeepFake Audio Analyzer</h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Deepfake Audio Detection & Forensic Spectral Analyzer
            </p>
          </div>
        </div>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.6, marginTop: '0.5rem' }}>
          <strong>DeepFake Audio Analyzer</strong> is an end-to-end digital forensic audio analysis system designed to protect individuals, institutions, and communication channels against synthetic voice cloning, social engineering scams, and automated audio impersonation.
        </p>
      </div>

      {/* Forensic Mission */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--primary-cyan)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} /> The Growing Threat of Audio Deepfakes
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1rem' }}>
          With the rapid proliferation of modern generative neural voice models (such as VITS, ElevenLabs, Tortoise-TTS, and HiFi-GAN vocoders), malicious actors can now clone human voices with just a few seconds of recorded audio. These synthetic replicas are increasingly weaponized for:
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f87171', marginBottom: '0.3rem' }}>CEO & Impersonation Fraud</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Impersonating corporate executives or family members over telephone lines to authorize fraudulent financial wire transfers.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.3rem' }}>Disinformation & Media Tampering</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Fabricating leaked audio recordings of political figures and public officials to manipulate elections or incite public panic.
            </p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.3rem' }}>Biometric Voice Bypass</h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              Attempting unauthorized access to banking call centers and security systems secured with voiceprint authentication.
            </p>
          </div>
        </div>
      </div>

      {/* Forensic Signal Methodology */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Cpu size={20} /> Signal Processing & Forensic Methodology
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.7 }}>
          <p>
            Unlike human listeners who can be easily deceived by synthetic audio, digital signal processing algorithms analyze physical and mathematical invariants in acoustic propagation:
          </p>

          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: 0 }}>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34d399" style={{ marginTop: '3px', flexShrink: 0 }} />
              <span><strong>Vocal Tract Acoustic Cavity:</strong> Human speech is physically constrained by the oral and pharyngeal cavities, creating continuous formant paths. Synthetic voice algorithms approximate this with discrete neural vocoder passes, leaving phase discontinuities.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34d399" style={{ marginTop: '3px', flexShrink: 0 }} />
              <span><strong>Spectral Energy Continuity:</strong> Neural generators often truncate higher spectral frequencies or introduce unnatural energy boosts in the 4kHz–8kHz range, visible in Mel Spectrogram heatmaps.</span>
            </li>
            <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
              <CheckCircle2 size={16} color="#34d399" style={{ marginTop: '3px', flexShrink: 0 }} />
              <span><strong>Zero Crossing Rate (ZCR) Jitter:</strong> Micro-temporal noise artifacts produced by neural vocoders exhibit anomalous zero-crossing distributions during unvoiced consonant transitions.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Institutional Project Attribution */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={20} className="text-gradient-cyan" /> Academic Project Attribution
        </h2>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
          This system was developed as a <strong>5th Semester Mini Project / Project-Based Learning (PBL)</strong> implementation for forensic audio authentication and machine learning verification.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>PROJECT DOMAIN</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>Acoustic Forensics & Deepfake Detection</p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>STACK ARCHITECTURE</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>React 19 + Node.js + Python + PostgreSQL</p>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>AI ENSEMBLE</p>
            <p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>HistGradientBoosting + RF + ExtraTrees</p>
          </div>
        </div>
      </div>

      {/* CTA Bottom Banner */}
      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
        <Link to="/upload" className="btn-primary" style={{ padding: '0.85rem 2rem', fontSize: '1rem' }}>
          <ShieldCheck size={18} /> Launch Forensic Workbench
        </Link>
      </div>

    </div>
  );
}
