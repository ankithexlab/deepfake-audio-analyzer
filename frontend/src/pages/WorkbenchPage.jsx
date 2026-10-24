import React, { useState } from 'react';
import UploadSection from '../components/UploadSection';
import MicrophoneRecorder from '../components/MicrophoneRecorder';
import SampleAudioSelector from '../components/SampleAudioSelector';
import AudioPlayer from '../components/AudioPlayer';
import ProcessingPipeline from '../components/ProcessingPipeline';
import VerdictBanner from '../components/VerdictBanner';
import SpectralCharts from '../components/SpectralCharts';
import ForensicReportModal from '../components/ForensicReportModal';
import { uploadAudioFile, preprocessAudio, runDeepfakeAnalysis } from '../services/api';
import { Activity, Radio, AlertCircle, ShieldCheck, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WorkbenchPage({
  currentFile,
  setCurrentFile,
  fileRecord,
  setFileRecord,
  preprocessingData,
  setPreprocessingData,
  analysisResult,
  setAnalysisResult,
}) {
  const [inputMode, setInputMode] = useState('upload'); // 'upload' | 'mic'
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [pipelineStatusText, setPipelineStatusText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Main Analysis Orchestrator
  const startFullAnalysis = async (file) => {
    if (!file) return;

    setErrorMsg('');
    setCurrentFile(file);
    setAnalysisResult(null);
    setPreprocessingData(null);
    setIsProcessing(true);

    try {
      // Step 1: Uploading Audio File
      setCurrentStep(1);
      setPipelineStatusText('Uploading audio file to security analysis server...');
      const uploadedRecord = await uploadAudioFile(file, file.name);
      setFileRecord(uploadedRecord);

      // Step 2 & 3: Audio Preprocessing & Feature Extraction
      setCurrentStep(2);
      setPipelineStatusText('Preprocessing audio (16kHz Mono resampling, vocal trimming & normalization)...');
      
      await new Promise((r) => setTimeout(r, 600));
      setCurrentStep(3);
      setPipelineStatusText('Extracting acoustic spectral features (MFCCs, Mel Spectrogram, ZCR, Pitch)...');
      
      const prepRecord = await preprocessAudio(uploadedRecord.fileId);
      setPreprocessingData(prepRecord.preprocessing);

      // Step 4: AI Model Deepfake Inference
      setCurrentStep(4);
      setPipelineStatusText('Running AI Deepfake Neural Classifier inference...');
      await new Promise((r) => setTimeout(r, 800));

      const resultPayload = await runDeepfakeAnalysis(uploadedRecord.fileId);
      setAnalysisResult(resultPayload.analysisResult);

      setCurrentStep(5); // Completed!
    } catch (err) {
      console.error('Analysis workflow error:', err);
      setErrorMsg(err.message || 'An error occurred during deepfake analysis.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentFile(null);
    setFileRecord(null);
    setPreprocessingData(null);
    setAnalysisResult(null);
    setCurrentStep(0);
    setErrorMsg('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Workbench Header Banner */}
      <div className="glass-panel" style={{ padding: '1.5rem 1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldCheck className="text-gradient-cyan" size={24} />
              Detection Workbench
            </h1>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Upload audio or record speech to inspect micro-acoustic features and verify authentic vs synthetic speech.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setInputMode('upload')}
              className={`btn-${inputMode === 'upload' ? 'primary' : 'secondary'}`}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <Activity size={15} /> File Upload
            </button>
            <button
              onClick={() => setInputMode('mic')}
              className={`btn-${inputMode === 'mic' ? 'primary' : 'secondary'}`}
              style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
            >
              <Radio size={15} /> Live Mic Recorder
            </button>
          </div>
        </div>
      </div>

      {/* ERROR ALERT */}
      {errorMsg && (
        <div style={{
          padding: '1rem 1.25rem',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: 'var(--radius-md)',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertCircle size={22} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>Analysis Pipeline Error</p>
              <p style={{ fontSize: '0.85rem' }}>{errorMsg}</p>
            </div>
          </div>
          <button onClick={handleReset} className="btn-danger" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Input Section */}
      {inputMode === 'upload' ? (
        <UploadSection onFileSelected={startFullAnalysis} isProcessing={isProcessing} />
      ) : (
        <MicrophoneRecorder onAudioRecorded={startFullAnalysis} isProcessing={isProcessing} />
      )}

      {/* Dataset Sample Selector */}
      <SampleAudioSelector onSampleSelected={startFullAnalysis} isProcessing={isProcessing} />

      {/* Audio Player for Selected / Uploaded File */}
      {currentFile && (
        <AudioPlayer audioFile={currentFile} fileRecord={fileRecord} />
      )}

      {/* Live Progress Pipeline */}
      {isProcessing && (
        <ProcessingPipeline currentStep={currentStep} statusText={pipelineStatusText} />
      )}

      {/* Final Verdict Banner */}
      {analysisResult && !isProcessing && (
        <VerdictBanner
          analysisResult={analysisResult}
          fileRecord={fileRecord}
          onReset={handleReset}
          onViewReport={() => setIsReportOpen(true)}
        />
      )}

      {/* Spectral Feature Preview & Link to full Forensics */}
      {preprocessingData && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', marginBottom: '0.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 className="text-gradient-cyan" size={18} />
              Acoustic Spectral Features Preview
            </h3>
            <Link to="/forensics" className="btn-secondary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
              View Deep Forensics & Heatmaps &rarr;
            </Link>
          </div>
          <SpectralCharts preprocessingData={preprocessingData} fileId={fileRecord?.fileId} />
        </div>
      )}

      {/* Forensic Report Modal */}
      <ForensicReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        analysisResult={analysisResult}
        fileRecord={fileRecord}
        preprocessingData={preprocessingData}
      />

    </div>
  );
}
