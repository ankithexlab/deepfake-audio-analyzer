import React from 'react';
import { Upload, Cpu, BarChart2, ShieldCheck, Loader2, CheckCircle2 } from 'lucide-react';

export default function ProcessingPipeline({ currentStep, statusText }) {
  const steps = [
    { id: 1, name: 'Upload & Parse', icon: Upload, desc: 'Storing raw audio file & metadata' },
    { id: 2, name: 'Signal Preprocess', icon: Cpu, desc: '16kHz Mono, Normalization & Trimming' },
    { id: 3, name: 'Feature Extraction', icon: BarChart2, desc: 'MFCCs, Mel Spectrogram & Spectral metrics' },
    { id: 4, name: 'AI Deepfake Model', icon: ShieldCheck, desc: 'Neural inference & forensic evaluation' },
  ];

  return (
    <div className="glass-panel" style={{ padding: '1.75rem', marginTop: '1.5rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Loader2 className="pulse-glow text-gradient-cyan" size={20} style={{ animation: 'spin 1.5s linear infinite' }} />
          Analyzing Audio Pipeline...
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          {statusText || 'Executing multi-stage acoustic signal analysis and AI deepfake detection...'}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        position: 'relative'
      }}>
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          let borderStyle = '1px solid var(--border-glass)';
          let bgStyle = 'rgba(15, 23, 42, 0.4)';
          let iconColor = 'var(--text-dim)';

          if (isDone) {
            borderStyle = '1px solid rgba(16, 185, 129, 0.4)';
            bgStyle = 'rgba(16, 185, 129, 0.08)';
            iconColor = '#34d399';
          } else if (isCurrent) {
            borderStyle = '1px solid rgba(56, 189, 248, 0.5)';
            bgStyle = 'rgba(56, 189, 248, 0.12)';
            iconColor = '#38bdf8';
          }

          return (
            <div key={step.id} style={{
              background: bgStyle,
              border: borderStyle,
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isCurrent ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: iconColor
                }}>
                  {isDone ? <CheckCircle2 size={18} /> : (isCurrent ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Icon size={18} />)}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: iconColor }}>
                  STAGE 0{step.id}
                </span>
              </div>

              <div>
                <p style={{ fontWeight: 600, fontSize: '0.9rem', color: isCurrent || isDone ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  {step.name}
                </p>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
