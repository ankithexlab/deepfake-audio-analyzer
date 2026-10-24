import React, { useEffect } from 'react';
import { ShieldCheck, ShieldAlert, Sparkles, AlertTriangle, FileText, RotateCcw } from 'lucide-react';
import canvasConfetti from 'canvas-confetti';

export default function VerdictBanner({ analysisResult, onReset, onViewReport }) {
  const isDeepfake = analysisResult?.isDeepfake || analysisResult?.label === 'FAKE';

  // Trigger celebration confetti once if Genuine Human Voice!
  useEffect(() => {
    if (analysisResult && !isDeepfake) {
      try {
        canvasConfetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch {
        // ignore if confetti fails
      }
    }
  }, [analysisResult, isDeepfake]);

  if (!analysisResult) return null;

  const confidencePct = (analysisResult.confidence * 100).toFixed(1);
  const realPct = (analysisResult.realProbability * 100).toFixed(1);
  const fakePct = (analysisResult.fakeProbability * 100).toFixed(1);

  return (
    <div style={{
      background: isDeepfake ? 'rgba(239, 68, 68, 0.08)' : 'rgba(16, 185, 129, 0.08)',
      border: isDeepfake ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)',
      borderRadius: 'var(--radius-lg)',
      padding: '2rem',
      marginTop: '1.5rem',
      boxShadow: isDeepfake ? '0 0 35px -5px rgba(239, 68, 68, 0.25)' : '0 0 35px -5px rgba(16, 185, 129, 0.25)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Radial */}
      <div style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '200px',
        height: '200px',
        borderRadius: '50%',
        background: isDeepfake ? 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Top Header Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-md)',
              background: isDeepfake ? 'linear-gradient(135deg, #ef4444, #991b1b)' : 'linear-gradient(135deg, #10b981, #047857)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: isDeepfake ? '0 0 20px rgba(239, 68, 68, 0.5)' : '0 0 20px rgba(16, 185, 129, 0.5)'
            }}>
              {isDeepfake ? <ShieldAlert size={36} /> : <ShieldCheck size={36} />}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className={`badge ${analysisResult.confidence < 0.55 ? 'badge-yellow' : isDeepfake ? 'badge-red' : 'badge-green'}`} style={{ fontSize: '0.75rem' }}>
                  {analysisResult.confidence < 0.55 ? '⚠ INCONCLUSIVE / LOW CONFIDENCE' : isDeepfake ? '● DEEPFAKE AUDIO DETECTED' : '✓ AUTHENTIC VOICE VERIFIED'}
                </span>
                <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                  Model: {analysisResult.modelName || 'Neural Classifier'}
                </span>
              </div>

              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em', marginTop: '0.25rem' }} className={isDeepfake ? 'text-gradient-red' : 'text-gradient-green'}>
                {analysisResult.confidence < 0.55 ? `${analysisResult.prediction} (LOW CONFIDENCE)` : isDeepfake ? 'DEEPFAKE VOICE' : 'REAL VOICE'}
              </h2>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={onViewReport} className="btn-primary" style={{ fontSize: '0.9rem' }}>
              <FileText size={16} /> Forensic Report
            </button>
            <button onClick={onReset} className="btn-secondary" style={{ fontSize: '0.9rem' }}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>

        </div>

        {/* Low-Reliability Warning Alert if present */}
        {analysisResult.lowReliabilityWarning && (
          <div style={{
            background: 'rgba(234, 179, 8, 0.12)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.85rem 1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#facc15',
            fontSize: '0.85rem',
            fontWeight: 500
          }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, color: '#facc15' }} />
            <div>
              <strong>Low-Reliability Analysis Notice:</strong> {analysisResult.lowReliabilityWarning}
            </div>
          </div>
        )}

        {/* Meter & Probability Bars */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.25rem',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.25rem',
          border: '1px solid var(--border-glass)'
        }}>
          
          {/* Confidence Score Meter */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Statistical Confidence (Pattern Estimation)</span>
              <span style={{ fontWeight: 700, color: 'var(--primary-cyan)' }}>{confidencePct}%</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${confidencePct}%`,
                background: 'linear-gradient(90deg, #38bdf8, #8b5cf6)',
                borderRadius: '5px',
                transition: 'width 1s ease'
              }} />
            </div>
          </div>

          {/* Genuine Human Probability */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Genuine Human Probability</span>
              <span style={{ fontWeight: 700, color: '#34d399' }}>{realPct}%</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${realPct}%`,
                background: '#10b981',
                borderRadius: '5px',
                transition: 'width 1s ease'
              }} />
            </div>
          </div>

          {/* AI Deepfake Probability */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Synthetic / AI Probability</span>
              <span style={{ fontWeight: 700, color: '#f87171' }}>{fakePct}%</span>
            </div>
            <div style={{ height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${fakePct}%`,
                background: '#ef4444',
                borderRadius: '5px',
                transition: 'width 1s ease'
              }} />
            </div>
          </div>

        </div>

        {/* Forensic Analysis Summary */}
        <div style={{
          background: 'rgba(15, 23, 42, 0.4)',
          borderRadius: 'var(--radius-sm)',
          padding: '1.25rem',
          border: '1px solid var(--border-glass)'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={16} className="text-gradient-cyan" />
            AI Key Forensic Signals & Explanation
          </h4>
          
          <ul style={{
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '0.6rem',
            listStyle: 'none',
            paddingLeft: 0
          }}>
            {isDeepfake ? (
              <>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={15} color="#ef4444" /> Unnatural pitch stability / low variance detected
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={15} color="#ef4444" /> High frequency spectral phase discontinuity
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={15} color="#ef4444" /> Synthetic vocoder artifact in high MFCC coefficients
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={15} color="#ef4444" /> Formant transition smoothing inconsistent with human vocal tract
                </li>
              </>
            ) : (
              <>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={15} color="#10b981" /> Natural acoustic glottal pulse & pitch modulation verified
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={15} color="#10b981" /> Organic harmonic energy distribution across spectral bands
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={15} color="#10b981" /> Consistent vocal tract formant transitions
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldCheck size={15} color="#10b981" /> No synthetic neural vocoder phase artifacts detected
                </li>
              </>
            )}
          </ul>

          {/* Forensic Responsibility & Probability Disclaimer */}
          <div style={{
            marginTop: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertTriangle size={13} style={{ flexShrink: 0, color: 'var(--primary-cyan)' }} />
            <span>
              <strong>Forensic Advisory:</strong> AI classifications represent statistical acoustic probability models. Predictions provide forensic indicators and do not constitute absolute legal proof of audio authenticity.
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
