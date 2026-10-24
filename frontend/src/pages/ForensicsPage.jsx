import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SpectralCharts from '../components/SpectralCharts';
import { BarChart2, Waves, ShieldAlert, ShieldCheck, Upload } from 'lucide-react';
import { getHistory } from '../services/api';

export default function ForensicsPage({ preprocessingData, fileRecord }) {
  const [historyItems, setHistoryItems] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // Load recent history items so user can inspect forensics of past scans as well!
  useEffect(() => {
    let isMounted = true;
    async function loadPastScans() {
      try {
        const res = await getHistory({ limit: 6 });
        if (isMounted && res.records) {
          setHistoryItems(res.records);
        }
      } catch (err) {
        console.warn('Could not load past scan files for forensics:', err);
      }
    }
    loadPastScans();
    return () => { isMounted = false; };
  }, []);

  const effectiveFileId = selectedFileId || fileRecord?.fileId;
  const effectivePreprocessing = selectedItem ? {
    featuresSummary: selectedItem.features_summary || {},
    samplingRateHz: 16000,
    cleanDurationSec: '4.00',
    fileId: selectedItem.file_id
  } : preprocessingData;

  const handleSelectHistoryScan = (record) => {
    setSelectedFileId(record.file_id);
    setSelectedItem(record);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Page Header */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <BarChart2 className="text-gradient-cyan" size={24} />
              Forensic Spectral Analyzer & Acoustic Forensics
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Deep acoustic feature verification: 128-band Mel Spectrograms, linear STFT frames, 13-band MFCC cepstrals, and Zero Crossing Rate trajectories.
            </p>
          </div>

          <Link to="/workbench" className="btn-primary" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
            <Upload size={15} /> Upload Suspect Audio
          </Link>
        </div>
      </div>

      {/* Selector: Choose between current session audio or past database scans */}
      {historyItems.length > 0 && (
        <div className="glass-panel" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Select Audio Asset to Inspect:
            </span>
            {fileRecord && (
              <button
                onClick={() => { setSelectedFileId(null); setSelectedItem(null); }}
                className={`tab-btn ${!selectedFileId ? 'active' : ''}`}
                style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}
              >
                Current Upload ({fileRecord.originalName})
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {historyItems.map((item) => (
              <button
                key={item.file_id}
                onClick={() => handleSelectHistoryScan(item)}
                style={{
                  background: selectedFileId === item.file_id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                  border: selectedFileId === item.file_id ? '1px solid var(--primary-cyan)' : '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.4rem 0.8rem',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  whiteSpace: 'nowrap'
                }}
              >
                {item.label === 'FAKE' ? (
                  <ShieldAlert size={14} color="#ef4444" />
                ) : (
                  <ShieldCheck size={14} color="#10b981" />
                )}
                <span>{item.original_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  ({item.format})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Forensic Charts & Heatmaps */}
      {effectivePreprocessing || effectiveFileId ? (
        <SpectralCharts
          preprocessingData={effectivePreprocessing}
          fileId={effectiveFileId}
        />
      ) : (
        <div className="glass-panel" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.1)',
            color: 'var(--primary-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem auto'
          }}>
            <Waves size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>
            No Active Audio File Loaded for Forensics
          </h3>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
            Upload an audio recording or select a pre-recorded dataset sample in the Detection Workbench to render 2D Mel Spectrograms, STFT heatmaps, and 13-band MFCC cepstrals.
          </p>
          <Link to="/workbench" className="btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
            <Upload size={16} /> Go to Detection Workbench
          </Link>
        </div>
      )}

      {/* Forensic Educational Guide Box */}
      <div className="grid-2">
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.6rem', color: 'var(--primary-cyan)' }}>
            Why MFCC Cepstral Analysis Detects Deepfakes
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            Mel-Frequency Cepstral Coefficients (MFCCs) model the human vocal tract geometry. Real human speech displays smooth, organically shifting formant transitions across frequency bands. Neural speech synthesizers (Tacotron, VITS, HiFi-GAN) often generate subtle phase misalignments and reduced variance across higher order cepstral coefficients (MFCC 9–13).
          </p>
        </div>

        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.6rem', color: '#c4b5fd' }}>
            Zero Crossing Rate (ZCR) & Spectral Centroid Significance
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            The Spectral Centroid indicates the "center of gravity" of the audio frequencies. AI voice generators frequently introduce unnatural high-frequency energy spikes or cutoff artifacts above 4kHz. Elevated Zero Crossing Rate (ZCR) in unvoiced segments reveals typical vocoder noise artifacts.
          </p>
        </div>
      </div>

    </div>
  );
}
