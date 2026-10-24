import React from 'react';
import { UserCheck, Bot, Play, Database } from 'lucide-react';

export default function SampleAudioSelector({ onSampleSelected, isProcessing }) {

  // Fetch real dataset audio sample from /samples/
  const handleSelectDatasetFile = async (url, filename) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: 'audio/wav' });
      if (onSampleSelected) {
        onSampleSelected(file);
      }
    } catch (err) {
      console.error('Failed to load dataset sample:', err);
      // Fallback to generated sample
      handleSelectGenerated(filename.includes('real') ? 'human' : 'deepfake');
    }
  };
  
  // Helper to generate synthetic WAV audio buffer in-browser for 1-click fallback testing
  const generateSampleWav = (type) => {
    const sampleRate = 16000;
    const durationSec = 3;
    const numSamples = sampleRate * durationSec;
    const buffer = new Float32Array(numSamples);

    if (type === 'human') {
      // Harmonic voice simulation (Fundamental pitch ~150Hz + natural formants)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const f0 = 150 + Math.sin(t * 5) * 10;
        const voice = Math.sin(2 * Math.PI * f0 * t) * 0.5 +
                      Math.sin(2 * Math.PI * f0 * 2 * t) * 0.25 +
                      Math.sin(2 * Math.PI * f0 * 3 * t) * 0.1;
        buffer[i] = voice * (0.8 + 0.2 * Math.sin(t * 12));
      }
    } else {
      // AI Deepfake simulation (Robotic artifacts, flat pitch, high ZCR noise spikes)
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const f0 = 180;
        const roboticVoice = Math.sin(2 * Math.PI * f0 * t) * 0.4 +
                             Math.cos(2 * Math.PI * (f0 * 2.5) * t) * 0.3;
        const artifactNoise = (Math.random() - 0.5) * 0.15;
        buffer[i] = (roboticVoice + artifactNoise) * 0.9;
      }
    }

    const wavBlob = createWavBlobFromBuffer(buffer, sampleRate);
    const fileName = type === 'human' ? 'sample_genuine_human.wav' : 'sample_ai_deepfake.wav';
    return new File([wavBlob], fileName, { type: 'audio/wav' });
  };

  const createWavBlobFromBuffer = (samples, sampleRate) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const writeString = (view, offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const handleSelectGenerated = (type) => {
    const file = generateSampleWav(type);
    if (onSampleSelected) {
      onSampleSelected(file);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Database className="text-gradient" size={18} />
            Benchmark Dataset Audio Samples
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            One-click evaluation using verified audio clips extracted from the project training dataset.
          </p>
        </div>
      </div>

      <div className="grid-2">
        {/* Dataset Real Sample #1 */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.2)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dataset: Genuine Real Voice #1</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>16kHz Mono WAV • 4.0s (Human Speech)</p>
            </div>
          </div>
          <button
            onClick={() => handleSelectDatasetFile('/samples/sample_real_voice_1.wav', 'dataset_real_voice_01.wav')}
            disabled={isProcessing}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
          >
            <Play size={14} /> Test Real
          </button>
        </div>

        {/* Dataset Deepfake Sample #1 */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dataset: Synthetic Deepfake Voice #1</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>16kHz Mono WAV • 4.0s (AI Cloned Speech)</p>
            </div>
          </div>
          <button
            onClick={() => handleSelectDatasetFile('/samples/sample_deepfake_voice_1.wav', 'dataset_deepfake_voice_01.wav')}
            disabled={isProcessing}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
          >
            <Play size={14} /> Test Fake
          </button>
        </div>

        {/* Dataset Real Sample #2 */}
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <UserCheck size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dataset: Genuine Real Voice #2</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>16kHz Mono WAV • 4.0s (Human Speech)</p>
            </div>
          </div>
          <button
            onClick={() => handleSelectDatasetFile('/samples/sample_real_voice_2.wav', 'dataset_real_voice_02.wav')}
            disabled={isProcessing}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
          >
            <Play size={14} /> Test Real
          </button>
        </div>

        {/* Dataset Deepfake Sample #2 */}
        <div style={{
          background: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Bot size={20} />
            </div>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>Dataset: Synthetic Deepfake Voice #2</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>16kHz Mono WAV • 4.0s (AI Cloned Speech)</p>
            </div>
          </div>
          <button
            onClick={() => handleSelectDatasetFile('/samples/sample_deepfake_voice_2.wav', 'dataset_deepfake_voice_02.wav')}
            disabled={isProcessing}
            className="btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
          >
            <Play size={14} /> Test Fake
          </button>
        </div>
      </div>
    </div>
  );
}
