import React from 'react';

/**
 * Professional brand logo for DeepFake Audio Analyzer.
 * Combines a shield silhouette with an audio waveform motif to convey
 * forensic audio security & AI-powered detection.
 *
 * Props:
 *   size  – overall width/height in px (default 40)
 *   style – optional inline styles forwarded to the outer wrapper
 */
export default function BrandLogo({ size = 40, style = {} }) {
  return (
    <div
      className="brand-logo-icon"
      style={{
        width: size,
        height: size,
        minWidth: size,
        minHeight: size,
        borderRadius: size * 0.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #8b5cf6 100%)',
        boxShadow: '0 0 18px rgba(99,102,241,0.45), 0 0 6px rgba(14,165,233,0.35)',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      {/* Subtle glass sheen overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '50%',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
          borderRadius: `${size * 0.25}px ${size * 0.25}px 0 0`,
          pointerEvents: 'none',
        }}
      />

      <svg
        viewBox="0 0 64 64"
        width={size * 0.68}
        height={size * 0.68}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Shield outline */}
        <path
          d="M32 4 L54 16 L54 34 C54 46 44 56 32 60 C20 56 10 46 10 34 L10 16 Z"
          fill="rgba(255,255,255,0.12)"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* Audio waveform bars inside shield – 7 bars with varying heights */}
        <g transform="translate(20, 20)">
          {/* Bar 1 */}
          <rect x="0" y="9" width="3" height="6" rx="1.5" fill="white" opacity="0.85" />
          {/* Bar 2 */}
          <rect x="5" y="5" width="3" height="14" rx="1.5" fill="white" opacity="0.9" />
          {/* Bar 3 */}
          <rect x="10" y="2" width="3" height="20" rx="1.5" fill="white" />
          {/* Bar 4 – center tallest */}
          <rect x="15" y="0" width="3" height="24" rx="1.5" fill="white" />
          {/* Bar 5 */}
          <rect x="20" y="4" width="3" height="16" rx="1.5" fill="white" opacity="0.95" />
          {/* Bar 6 */}
          <rect x="25" y="7" width="3" height="10" rx="1.5" fill="white" opacity="0.85" />
        </g>

        {/* Small scan-line accent */}
        <line
          x1="16"
          y1="48"
          x2="48"
          y2="48"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="3 3"
        />
      </svg>
    </div>
  );
}
