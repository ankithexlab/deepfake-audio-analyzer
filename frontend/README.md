# DeepFake Audio Analyzer — Frontend Client

The frontend client for the DeepFake Audio Analyzer platform, built with **React 18** and **Vite**.

## Features
- **Dark Forensic Theme:** Tailored for spectral analysis, waveform visualization, and audio feature inspection.
- **Audio Workbench:** Drag-and-drop audio uploader, live microphone recording, and preloaded ground-truth test samples.
- **Forensic Lab:** Multi-panel canvas rendering time-domain waveforms, linear STFT spectrograms, and 128-band Mel power spectrograms.
- **Interactive Dashboard:** Live real-time scan statistics, class distribution gauges, and 6,000-sample dataset summary.
- **History & Audit:** Filterable scan audit table (All, Authentic, Deepfake, Pending) with direct PDF report and CSV audit downloads.
- **Authentication:** Role-based access control with single-click Guest Demo examiner login.

## Development Scripts
```bash
npm install      # Install dependencies
npm run dev      # Start Vite development server on http://localhost:3000
npm run build    # Build production bundle into /dist
npm run lint     # Run Oxlint validation
npm run preview  # Preview production build locally
```
