import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import BrandLogo from './BrandLogo';

export default function Footer({ apiStatus, modelInfo }) {
  const isConnected = apiStatus?.status === 'ok';

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        {/* Brand Information */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <BrandLogo size={32} />
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
              DeepFake Audio Analyzer
            </span>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '380px', marginBottom: '1rem' }}>
            Deepfake Audio Detection & Forensic Spectral Analyzer. Providing forensic verification of acoustic signals, multi-band MFCC feature extraction, and machine learning ensemble defense against synthetic speech impersonation.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
              16kHz Resampling
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
              170-dim Acoustic Vector
            </span>
            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
              Ensemble ML
            </span>
          </div>
        </div>

        {/* Column 1: Forensic Detection */}
        <div>
          <h4 className="footer-title">Forensic Detection</h4>
          <ul className="footer-links">
            <li>
              <Link to="/workbench">Detection Workbench</Link>
            </li>
            <li>
              <Link to="/forensics">Spectral Analyzer</Link>
            </li>
            <li>
              <Link to="/workbench">Microphone Live Recorder</Link>
            </li>
            <li>
              <Link to="/models">Acoustic Feature Extraction</Link>
            </li>
            <li>
              <Link to="/history">Forensic PDF Reports</Link>
            </li>
          </ul>
        </div>

        {/* Column 2: Platform & Audit */}
        <div>
          <h4 className="footer-title">Platform & Data</h4>
          <ul className="footer-links">
            <li>
              <Link to="/dashboard">Analytics Dashboard</Link>
            </li>
            <li>
              <Link to="/history">PostgreSQL Scan History</Link>
            </li>
            <li>
              <Link to="/models">Machine Learning Specs</Link>
            </li>
            <li>
              <a href="http://localhost:5000/api/v1/health" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                System Health API <ExternalLink size={12} />
              </a>
            </li>
            <li>
              <Link to="/contact">Academic Evaluation</Link>
            </li>
          </ul>
        </div>

        {/* Column 3: Institutional & About */}
        <div>
          <h4 className="footer-title">Project & Mission</h4>
          <ul className="footer-links">
            <li>
              <Link to="/about">Forensic Methodology</Link>
            </li>
            <li>
              <Link to="/about">Project Overview</Link>
            </li>
            <li>
              <Link to="/contact">Security Disclosures</Link>
            </li>
            <li>
              <Link to="/contact">Contact Research Team</Link>
            </li>
            <li>
              <Link to="/login">Examiner Demo Login</Link>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <div>
          &copy; {new Date().getFullYear()} <strong>DeepFake Audio Analyzer</strong>. All rights reserved.
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span>
            API Status: <strong style={{ color: isConnected ? '#34d399' : '#f87171' }}>{isConnected ? 'Online (Port 5000)' : 'Offline'}</strong>
          </span>
          {modelInfo?.name && (
            <span>
              Engine: <strong style={{ color: '#c4b5fd' }}>{modelInfo.name}</strong>
            </span>
          )}
        </div>
      </div>
    </footer>
  );
}
