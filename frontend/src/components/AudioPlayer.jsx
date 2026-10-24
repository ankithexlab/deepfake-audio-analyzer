import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music, RotateCcw } from 'lucide-react';

export default function AudioPlayer({ audioFile, fileRecord }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');

  const audioRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!audioFile) return;

    let url = '';
    if (audioFile instanceof File || audioFile instanceof Blob) {
      url = URL.createObjectURL(audioFile);
    } else if (typeof audioFile === 'string') {
      url = audioFile;
    }
    setAudioUrl(url);

    return () => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    };
  }, [audioFile]);

  // Draw static amplitude waveform visualization on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bars = 80;
    const barWidth = width / bars;
    const progressIndex = Math.floor((currentTime / (duration || 1)) * bars);

    for (let i = 0; i < bars; i++) {
      // Deterministic synthetic waveform pattern
      const amplitude = Math.abs(Math.sin(i * 0.25) * Math.cos(i * 0.1) * 0.7 + Math.sin(i * 0.8) * 0.3);
      const barHeight = Math.max(6, amplitude * (height - 10));

      const isPlayed = i <= progressIndex;
      ctx.fillStyle = isPlayed ? '#38bdf8' : 'rgba(255, 255, 255, 0.15)';

      const x = i * barWidth;
      const y = (height - barHeight) / 2;
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    }
  }, [currentTime, duration]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || !audioRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const seekRatio = clickX / rect.width;
    const newTime = seekRatio * (duration || 0);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Music className="text-gradient-cyan" size={18} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
            {fileRecord?.originalName || audioFile?.name || 'Selected Audio Stream'}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Waveform Canvas */}
      <canvas
        ref={canvasRef}
        width={600}
        height={50}
        onClick={handleSeek}
        style={{
          width: '100%',
          height: '50px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '6px',
          cursor: 'pointer',
          border: '1px solid var(--border-glass)'
        }}
      />

      {/* Controls Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={togglePlay} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? 'Pause' : 'Play Audio'}
          </button>
          <button
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            className="btn-secondary"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            title="Replay from start"
          >
            <RotateCcw size={16} />
          </button>
        </div>

        {/* Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            {isMuted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            style={{ width: '80px', accentColor: 'var(--primary-cyan)', cursor: 'pointer' }}
          />
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        style={{ display: 'none' }}
      />
    </div>
  );
}
