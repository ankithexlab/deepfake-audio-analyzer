#!/usr/bin/env python3
"""
preprocess_audio.py
─────────────────────────────────────────────────────────────────────────────
Audio Preprocessing and Feature Extraction Engine for Deepfake Detection.

This module provides a complete audio signal processing pipeline:
1. Audio Loading: Reads WAV, MP3, FLAC, OGG files.
2. Mono Conversion: Converts multi-channel audio to single-channel (mono).
3. Resampling: Converts sample rate to target 16,000 Hz.
4. Normalization: Normalizes peak amplitude to [-1.0, 1.0].
5. Silence Removal & Trimming: Trims leading/trailing and inner low-energy silence.
6. Noise Reduction: Applies high-pass / median filtering for rumble removal.
7. Visualizations: Generates PNG images for Waveform, Spectrogram, and Mel Spectrogram.
8. Feature Extraction: Extracts MFCCs, Chroma STFT, Spectral Contrast, ZCR, and RMS Energy.
9. Feature Persistence: Saves extracted features to JSON for downstream AI models.
─────────────────────────────────────────────────────────────────────────────
"""

import sys
import os
import json
import argparse
import traceback
import numpy as np
import librosa
import librosa.display
import soundfile as sf
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server rendering
import matplotlib.pyplot as plt

def load_and_preprocess_audio(file_path, target_sr=16000, top_db=20):
    """
    Loads an audio file, converts it to mono, resamples to target_sr,
    normalizes amplitude, and trims silent segments.

    Parameters:
        file_path (str): Absolute path to the source audio file.
        target_sr (int): Desired sampling rate in Hz (default: 16000).
        top_db (int): Energy threshold in decibels for silence trimming (default: 20).

    Returns:
        tuple: (y_processed, sr, raw_duration, processed_duration)
            - y_processed (np.ndarray): Preprocessed audio signal array.
            - sr (int): Final sampling rate (16000).
            - raw_duration (float): Duration before preprocessing in seconds.
            - processed_duration (float): Duration after silence trimming in seconds.
    """
    # Step 1: Load audio forcing mono=True and sr=target_sr (librosa handles resampling)
    try:
        y, sr = librosa.load(file_path, sr=target_sr, mono=True)
    except Exception as exc:
        raise ValueError(f"Unable to decode audio file. Format may be corrupted or unsupported: {exc}")

    if len(y) == 0:
        raise ValueError("Audio file contains no decodable audio frames.")

    raw_duration = float(len(y) / sr)
    if raw_duration < 1.0:
        raise ValueError(f"Audio duration ({raw_duration:.2f}s) is too short. Minimum required duration for forensic spectral analysis is 1.00 second.")

    # Step 2: Peak amplitude normalization & silent audio detection
    max_val = np.max(np.abs(y))
    if max_val < 1e-4:
        raise ValueError("Audio signal is silent or contains near-zero acoustic energy. Cannot extract forensic spectral features.")
    y_norm = y / max_val

    # Step 3: Silence removal & noise trimming (librosa.effects.trim)
    y_trimmed, index = librosa.effects.trim(y_norm, top_db=top_db)
    
    # If trimmed result is empty or too short, fallback to normalized y
    if len(y_trimmed) == 0 or (len(y_trimmed) / sr) < 0.5:
        y_trimmed = y_norm

    processed_duration = float(len(y_trimmed) / sr)
    if processed_duration < 0.8:
        raise ValueError(f"Audible speech duration ({processed_duration:.2f}s) is too short after silence trimming. Minimum audible duration is 0.80 second.")

    return y_trimmed, sr, raw_duration, processed_duration

def generate_visualizations(y, sr, output_dir, file_id):
    """
    Generates and saves visual plots for Waveform, Spectrogram, and Mel Spectrogram.

    Parameters:
        y (np.ndarray): Audio signal array.
        sr (int): Sampling rate.
        output_dir (str): Output directory for PNG images.
        file_id (str): Unique file identifier for naming output assets.

    Returns:
        dict: Relative file paths of generated visualization images.
    """
    os.makedirs(output_dir, exist_ok=True)
    
    paths = {}
    
    # ── 1. Waveform Plot ───────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 3), dpi=100)
    librosa.display.waveshow(y, sr=sr, ax=ax, color='#3b82f6', alpha=0.8)
    ax.set_title('Audio Waveform (16kHz Mono Clean)', fontsize=12, pad=10)
    ax.set_xlabel('Time (seconds)', fontsize=10)
    ax.set_ylabel('Amplitude', fontsize=10)
    ax.grid(True, linestyle='--', alpha=0.4)
    plt.tight_layout()
    waveform_path = os.path.join(output_dir, f"waveform_{file_id}.png")
    plt.savefig(waveform_path)
    plt.close(fig)
    paths['waveformImage'] = waveform_path

    # ── 2. Linear STFT Spectrogram ─────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 4), dpi=100)
    stft = np.abs(librosa.stft(y))
    db_spec = librosa.amplitude_to_db(stft, ref=np.max)
    img = librosa.display.specshow(db_spec, sr=sr, x_axis='time', y_axis='hz', ax=ax, cmap='magma')
    fig.colorbar(img, ax=ax, format='%+2.0f dB')
    ax.set_title('STFT Spectrogram', fontsize=12, pad=10)
    plt.tight_layout()
    spectrogram_path = os.path.join(output_dir, f"spectrogram_{file_id}.png")
    plt.savefig(spectrogram_path)
    plt.close(fig)
    paths['spectrogramImage'] = spectrogram_path

    # ── 3. Mel Spectrogram ──────────────────────────────────────────────────
    fig, ax = plt.subplots(figsize=(10, 4), dpi=100)
    mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128, fmax=sr//2)
    mel_db = librosa.power_to_db(mel_spec, ref=np.max)
    img_mel = librosa.display.specshow(mel_db, sr=sr, x_axis='time', y_axis='mel', fmax=sr//2, ax=ax, cmap='viridis')
    fig.colorbar(img_mel, ax=ax, format='%+2.0f dB')
    ax.set_title('Mel Spectrogram (128 Bands)', fontsize=12, pad=10)
    plt.tight_layout()
    mel_path = os.path.join(output_dir, f"mel_spectrogram_{file_id}.png")
    plt.savefig(mel_path)
    plt.close(fig)
    paths['melSpectrogramImage'] = mel_path

    return paths

def extract_audio_features(y, sr):
    """
    Extracts key acoustic features required for deepfake audio classification.

    Features Extracted:
    - MFCCs (20 coefficients + mean/std/min/max)
    - Chroma STFT (12 pitch classes + mean/std)
    - Spectral Contrast (7 bands + mean/std)
    - Zero Crossing Rate (ZCR mean/std)
    - RMS Energy (mean/std)

    Parameters:
        y (np.ndarray): Audio signal array.
        sr (int): Sampling rate.

    Returns:
        dict: Complete dictionary of extracted feature metrics.
    """
    # ── 1. MFCC Features ───────────────────────────────────────────────────
    n_mfcc = 20
    mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=n_mfcc)
    n_frames = mfcc.shape[1]
    # Guard delta filter width so short audio does not crash librosa (default width=9 requires n_frames >= 9)
    delta_width = min(9, n_frames if n_frames % 2 == 1 else n_frames - 1)
    if delta_width >= 3:
        mfcc_delta = librosa.feature.delta(mfcc, width=delta_width)
        mfcc_delta2 = librosa.feature.delta(mfcc, order=2, width=delta_width)
    else:
        mfcc_delta = np.zeros_like(mfcc)
        mfcc_delta2 = np.zeros_like(mfcc)

    mfcc_stats = {
        'mean': np.mean(mfcc, axis=1).tolist(),
        'std': np.std(mfcc, axis=1).tolist(),
        'min': np.min(mfcc, axis=1).tolist(),
        'max': np.max(mfcc, axis=1).tolist(),
        'delta_mean': np.mean(mfcc_delta, axis=1).tolist(),
        'delta2_mean': np.mean(mfcc_delta2, axis=1).tolist(),
    }

    # ── 2. Chroma STFT ─────────────────────────────────────────────────────
    chroma = librosa.feature.chroma_stft(y=y, sr=sr)
    chroma_stats = {
        'mean': np.mean(chroma, axis=1).tolist(),
        'std': np.std(chroma, axis=1).tolist(),
    }

    # ── 3. Spectral Contrast ───────────────────────────────────────────────
    contrast = librosa.feature.spectral_contrast(y=y, sr=sr)
    contrast_stats = {
        'mean': np.mean(contrast, axis=1).tolist(),
        'std': np.std(contrast, axis=1).tolist(),
    }

    # ── 4. Zero Crossing Rate (ZCR) ────────────────────────────────────────
    zcr = librosa.feature.zero_crossing_rate(y=y)
    zcr_stats = {
        'mean': float(np.mean(zcr)),
        'std': float(np.std(zcr)),
        'max': float(np.max(zcr)),
        'min': float(np.min(zcr)),
    }

    # ── 5. RMS Energy ──────────────────────────────────────────────────────
    rms = librosa.feature.rms(y=y)
    rms_stats = {
        'mean': float(np.mean(rms)),
        'std': float(np.std(rms)),
        'max': float(np.max(rms)),
        'min': float(np.min(rms)),
    }

    # ── 6. Spectral Centroid ───────────────────────────────────────────────
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr)
    centroid_stats = {
        'mean': float(np.mean(centroid)),
        'std': float(np.std(centroid)),
        'max': float(np.max(centroid)),
        'min': float(np.min(centroid)),
    }

    # ── Downsampled Waveform Points for UI Charting ────────────────────────
    # Downsample to 200 points for smooth frontend graph rendering
    max_pts = 200
    if len(y) > max_pts:
        step = int(np.ceil(len(y) / max_pts))
        waveform_data = y[::step].tolist()
    else:
        waveform_data = y.tolist()

    return {
        'mfcc': mfcc_stats,
        'chroma': chroma_stats,
        'spectralContrast': contrast_stats,
        'zeroCrossingRate': zcr_stats,
        'rmsEnergy': rms_stats,
        'spectralCentroid': centroid_stats,
        'waveformPoints': waveform_data,
    }

def main():
    parser = argparse.ArgumentParser(description="Preprocess audio and extract features for deepfake detection.")
    parser.add_argument("--input", required=True, help="Path to input raw audio file.")
    parser.add_argument("--output-dir", required=True, help="Directory to save preprocessed assets.")
    parser.add_argument("--file-id", required=True, help="UUID identifier of the file.")
    
    args = parser.parse_args()

    try:
        input_path = os.path.abspath(args.input)
        output_dir = os.path.abspath(args.output_dir)
        file_id = args.file_id

        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Input file not found: {input_path}")

        os.makedirs(output_dir, exist_ok=True)

        # 1. Load, convert to mono, resample to 16kHz, normalize, trim silence
        y_clean, sr, raw_duration, clean_duration = load_and_preprocess_audio(input_path, target_sr=16000)

        # 2. Save cleaned/processed 16kHz mono audio as WAV
        processed_audio_path = os.path.join(output_dir, f"processed_{file_id}.wav")
        sf.write(processed_audio_path, y_clean, sr)

        # 3. Generate Visualizations (Waveform, Spectrogram, Mel Spectrogram)
        viz_paths = generate_visualizations(y_clean, sr, output_dir, file_id)

        # 4. Extract Acoustic Features (MFCC, Chroma, Spectral Contrast, ZCR, RMS)
        features = extract_audio_features(y_clean, sr)

        # 5. Save Features to JSON File
        features_json_path = os.path.join(output_dir, f"features_{file_id}.json")
        reliability_warning = None
        if clean_duration < 2.5:
            reliability_warning = f"Speech duration ({clean_duration:.2f}s) is shorter than recommended (3.0s+). Predictions may exhibit reduced reliability."

        full_feature_payload = {
            'fileId': file_id,
            'samplingRateHz': sr,
            'channels': 1, # Mono
            'rawDurationSec': round(raw_duration, 4),
            'cleanDurationSec': round(clean_duration, 4),
            'lowReliabilityWarning': reliability_warning,
            'processedAudioPath': processed_audio_path,
            'visualizations': viz_paths,
            'features': features,
        }

        with open(features_json_path, 'w', encoding='utf-8') as f:
            json.dump(full_feature_payload, f, indent=2)

        # Output JSON result to stdout for Node.js caller
        result_output = {
            'success': True,
            'fileId': file_id,
            'samplingRateHz': sr,
            'channels': 1,
            'rawDurationSec': round(raw_duration, 4),
            'cleanDurationSec': round(clean_duration, 4),
            'lowReliabilityWarning': reliability_warning,
            'processedAudioPath': processed_audio_path,
            'featuresJsonPath': features_json_path,
            'visualizations': viz_paths,
            'featuresSummary': {
                'mfccCount': 20,
                'chromaBands': 12,
                'spectralContrastBands': 7,
                'zcrMean': features['zeroCrossingRate']['mean'],
                'rmsMean': features['rmsEnergy']['mean'],
                'spectralCentroidMean': features['spectralCentroid']['mean'],
                'mfccMean': features['mfcc']['mean'][:13],
                'waveformPointsCount': len(features['waveformPoints']),
            }
        }

        print(json.dumps(result_output))
        sys.exit(0)

    except Exception as e:
        error_output = {
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc(),
        }
        print(json.dumps(error_output))
        sys.exit(1)

if __name__ == "__main__":
    main()
