import React from 'react';
import { Cpu } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Header({ apiStatus, modelInfo }) {
  const isConnected = apiStatus?.status === 'ok';

  return (
    <header className="header-bar">
      <div className="brand-logo">
        <BrandLogo size={40} />
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            DeepFake Audio Analyzer
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Deepfake Audio Detection & Forensic Spectral Analyzer
          </p>
        </div>
      </div>

      {/* Backend & Model Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className={`badge ${isConnected ? 'badge-green' : 'badge-red'}`} title="Backend API Health">
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
              display: 'inline-block',
              boxShadow: isConnected ? '0 0 8px #10b981' : 'none'
            }}></span>
            {isConnected ? 'API Online' : 'API Offline'}
          </div>

          {modelInfo && (
            <div className="badge badge-purple" title={`Active AI Model: ${modelInfo.name}`}>
              <Cpu size={14} />
              {modelInfo.type?.toUpperCase()} Engine
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
