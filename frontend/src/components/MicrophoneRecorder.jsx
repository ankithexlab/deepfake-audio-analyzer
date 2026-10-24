import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, RefreshCw, Send, Radio } from 'lucide-react';

export default function MicrophoneRecorder({ onAudioRecorded, isProcessing }) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const [hasPermission, setHasPermission] = useState(null); // null | true | false
  const [warningMsg, setWarningMsg] = useState('');

  const audioStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const audioCtxRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close().catch(() => {});
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  /**
   * Encodes an AudioBuffer into standard 16-bit PCM RIFF WAV format
   */
  const audioBufferToWavBlob = (audioBuffer) => {
    const numChannels = 1; // force mono
    const sampleRate = audioBuffer.sampleRate;
    const channelData = audioBuffer.getChannelData(0);
    const dataLength = channelData.length * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);

    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, numChannels, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true); // 16-bit
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    let offset = 44;
    for (let i = 0; i < channelData.length; i++) {
      const sample = Math.max(-1, Math.min(1, channelData[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }

    return new Blob([buffer], { type: 'audio/wav' });
  };

  const startRecording = async () => {
    setWarningMsg('');
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      setHasPermission(true);

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
            ? 'audio/ogg;codecs=opus'
            : '';

      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const canvas = canvasRef.current;
      const ctx = canvas ? canvas.getContext('2d') : null;

      const drawVisualizer = () => {
        if (!canvas || !ctx) return;
        animFrameRef.current = requestAnimationFrame(drawVisualizer);
        analyser.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * canvas.height;
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, '#38bdf8');
          gradient.addColorStop(1, '#8b5cf6');

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
          x += barWidth + 1;
        }
      };
      drawVisualizer();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());

        const rawBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });

        try {
          // Convert browser recording to pure WAV using Web Audio API
          const arrayBuf = await rawBlob.arrayBuffer();
          const decodeCtx = new (window.AudioContext || window.webkitAudioContext)();
          const decodedAudio = await decodeCtx.decodeAudioData(arrayBuf);

          // Quality & Silence Validation
          const channelData = decodedAudio.getChannelData(0);
          let sumSquares = 0;
          let peak = 0;
          for (let i = 0; i < channelData.length; i++) {
            const val = Math.abs(channelData[i]);
            if (val > peak) peak = val;
            sumSquares += channelData[i] * channelData[i];
          }
          const rms = Math.sqrt(sumSquares / channelData.length);

          if (peak < 0.01 || rms < 0.005) {
            setWarningMsg('Notice: Low audio level detected. The recording might be silent or muted.');
          }

          const wavBlob = audioBufferToWavBlob(decodedAudio);
          const url = URL.createObjectURL(wavBlob);
          setAudioBlob(wavBlob);
          setAudioUrl(url);

          if (decodeCtx.state !== 'closed') {
            await decodeCtx.close();
          }
        } catch (convErr) {
          console.warn('WAV conversion fallback to raw blob:', convErr);
          const fallbackWav = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const url = URL.createObjectURL(fallbackWav);
          setAudioBlob(fallbackWav);
          setAudioUrl(url);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl('');

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Microphone access denied or error:', err);
      setHasPermission(false);
      setWarningMsg('Microphone access was denied or is unavailable. Please grant microphone permissions in your browser settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (!audioPlayerRef.current) return;
    if (isPlaying) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
    } else {
      audioPlayerRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUseRecording = () => {
    if (!audioBlob) return;

    if (recordingTime < 1) {
      setWarningMsg('Recording is too short. Please record at least 1 second of audio.');
      return;
    }

    if (onAudioRecorded) {
      const file = new File([audioBlob], `mic_recording_${Date.now()}.wav`, { type: 'audio/wav' });
      onAudioRecorded(file);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Radio className="text-gradient-red" size={22} />
            Live Voice Recorder
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Record your own voice live from microphone to test deepfake analysis in real-time.
          </p>
        </div>
        <span className={`badge ${isRecording ? 'badge-red pulse-glow' : 'badge-purple'}`}>
          {isRecording ? '● Recording Active' : 'Mic Ready'}
        </span>
      </div>

      {/* Warning / Error notice */}
      {warningMsg && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: hasPermission === false ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
          border: hasPermission === false ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(245,158,11,0.3)',
          borderRadius: 'var(--radius-sm)',
          color: hasPermission === false ? '#f87171' : '#fbbf24',
          fontSize: '0.85rem'
        }}>
          {warningMsg}
        </div>
      )}

      {/* Visualizer Canvas & Controls */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-glass)',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem'
      }}>
        {/* Realtime Audio Spectrum Canvas */}
        <canvas
          ref={canvasRef}
          width={500}
          height={80}
          style={{
            width: '100%',
            height: '80px',
            borderRadius: '6px',
            background: 'rgba(0,0,0,0.3)',
            border: isRecording ? '1px solid rgba(239,68,68,0.5)' : '1px solid var(--border-glass)'
          }}
        />

        {/* Recording Timer */}
        <div style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }} className={isRecording ? 'text-gradient-red' : 'text-gradient-cyan'}>
          {formatTime(recordingTime)}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)' }}
            >
              <Mic size={18} /> Record Voice
            </button>
          ) : (
            <button onClick={stopRecording} className="btn-danger">
              <Square size={18} /> Stop Recording
            </button>
          )}

          {audioUrl && !isRecording && (
            <>
              <button onClick={togglePlayback} className="btn-secondary">
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                {isPlaying ? 'Pause' : 'Listen Recording'}
              </button>

              <button
                onClick={() => {
                  setAudioBlob(null);
                  setAudioUrl('');
                  setRecordingTime(0);
                  setIsPlaying(false);
                }}
                className="btn-secondary"
                title="Discard and record again"
              >
                <RefreshCw size={18} /> Re-record
              </button>

              <button
                onClick={handleUseRecording}
                disabled={isProcessing}
                className="btn-primary"
              >
                <Send size={18} /> Analyze Recording
              </button>
            </>
          )}
        </div>

        {/* Hidden Audio element for playback */}
        {audioUrl && (
          <audio
            ref={audioPlayerRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            style={{ display: 'none' }}
          />
        )}
      </div>
    </div>
  );
}
