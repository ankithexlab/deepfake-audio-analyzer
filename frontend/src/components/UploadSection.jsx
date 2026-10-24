import React, { useState, useRef } from 'react';
import { UploadCloud, FileAudio, CheckCircle2, AlertCircle, Music } from 'lucide-react';

export default function UploadSection({ onFileSelected, isProcessing }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const ALLOWED_TYPES = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/flac', 'audio/ogg', 'audio/x-wav', 'audio/x-flac'];
  const MAX_SIZE_MB = 50;

  const validateAndSetFile = (file) => {
    setErrorMsg('');
    if (!file) return;

    // Check extension / mime
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['wav', 'mp3', 'flac', 'ogg'];
    
    if (!validExts.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
      setErrorMsg('Invalid file format. Please upload a WAV, MP3, FLAC, or OGG audio file.');
      return;
    }

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File size exceeds maximum limit of ${MAX_SIZE_MB}MB.`);
      return;
    }

    setSelectedFile(file);
    if (onFileSelected) {
      onFileSelected(file);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(1) + ' KB';
    }
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UploadCloud className="text-gradient-cyan" size={22} />
            Audio File Upload
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Upload raw voice audio to run acoustic feature extraction & deepfake detection.
          </p>
        </div>
        <span className="badge badge-cyan">WAV / MP3 / FLAC</span>
      </div>

      {/* Drag Drop Area */}
      <div
        className={`dropzone ${dragActive ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".wav,.mp3,.flac,.ogg,audio/*"
          style={{ display: 'none' }}
          onChange={handleChange}
          disabled={isProcessing}
        />

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(56, 189, 248, 0.1)',
            color: 'var(--primary-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}>
            <Music size={28} />
          </div>

          <div>
            <p style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>
              Drag & Drop your audio file here
            </p>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              or click to browse your computer
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
              Max size: 50MB
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
              Formats: WAV, MP3, FLAC, OGG
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div style={{
          marginTop: '1rem',
          padding: '0.75rem 1rem',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: 'var(--radius-sm)',
          color: '#fca5a5',
          fontSize: '0.88rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Selected File Card */}
      {selectedFile && !errorMsg && (
        <div style={{
          marginTop: '1.25rem',
          padding: '1rem',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: 'var(--radius-sm)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileAudio size={24} className="text-gradient-cyan" />
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                {selectedFile.name}
              </p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {formatFileSize(selectedFile.size)} • Ready for analysis
              </p>
            </div>
          </div>

          <span className="badge badge-green">
            <CheckCircle2 size={14} /> Ready
          </span>
        </div>
      )}
    </div>
  );
}
