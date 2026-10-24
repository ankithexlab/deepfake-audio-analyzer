"""
ai_models/mock_model.py
────────────────────────────────────────────────────────────────────────
MockModel — Heuristic-based deepfake audio detection.

This is NOT a trained machine learning model. It uses a hand-crafted
combination of acoustic feature heuristics to produce a deterministic,
reproducible prediction suitable for development, integration testing,
and fallback when real model weights are unavailable.

Heuristic rationale:
  • MFCC regularity (low std) → natural speech is spectrally varied;
    synthesised audio tends to be more regular.
  • Spectral contrast (low dB) → natural speech has high peak-to-valley
    contrast; TTS/GAN output is spectrally flatter.
  • Zero-crossing rate (high) → synthesis artefacts can increase ZCR.
  • RMS energy anomaly (very high/low) → unusual energy is suspicious.
  • MFCC[0] distribution → energy coefficient differs in synthetic audio.

A sigmoid maps the weighted score to a smooth fake probability.
Confidence is derived from the margin away from the 0.5 boundary.

To plug in a real model: subclass BaseModel, implement load() + predict(),
and register the class in model_registry.py.
────────────────────────────────────────────────────────────────────────
"""

import math
import logging
from typing import Dict, Any, List

from .base_model import BaseModel

log = logging.getLogger('mock_model')


class MockModel(BaseModel):
    """
    Heuristic deepfake detection model — always available as fallback.

    Produces deterministic, feature-driven results (not random).
    Safe for development and CI; not suitable for production detection.
    """

    def __init__(self) -> None:
        super().__init__(name='HeuristicDetector', version='1.0.0')

    # ── load ─────────────────────────────────────────────────────────

    def load(self, model_path: str = None) -> None:
        """
        No weights to load — heuristic model is self-contained.

        Args:
            model_path: Ignored. Included for interface compliance.
        """
        self.loaded = True
        log.info(
            f"MockModel '{self.name}' v{self.version} ready "
            f"(heuristic mode — no weights required)."
        )

    # ── predict ──────────────────────────────────────────────────────

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compute a heuristic deepfake probability from extracted features.

        Args:
            features (dict): The 'features' sub-dict from the preprocessing
                             JSON output (mfcc, chroma, spectralContrast,
                             zeroCrossingRate, rmsEnergy, waveformPoints).

        Returns:
            dict: Structured prediction result.

        Raises:
            RuntimeError: If load() was not called first.
        """
        self._require_loaded()

        # ── 1. Unpack features ────────────────────────────────────────
        mfcc_data    = features.get('mfcc', {})
        mfcc_means: List[float] = mfcc_data.get('mean', [0.0] * 20)
        mfcc_stds:  List[float] = mfcc_data.get('std',  [1.0] * 20)

        zcr_data = features.get('zeroCrossingRate', {})
        zcr_mean: float = zcr_data.get('mean', 0.05)

        rms_data = features.get('rmsEnergy', {})
        rms_mean: float = rms_data.get('mean', 0.10)

        contrast_data = features.get('spectralContrast', {})
        contrast_means: List[float] = contrast_data.get('mean', [10.0] * 7)

        # ── 2. Per-feature scores (each 0.0 = natural, 1.0 = synthetic) ─

        # A. MFCC regularity — synthetic audio has lower spectral variance
        #    Typical avg std: natural ~5–20, synthetic ~2–8; normalise to 20.
        avg_mfcc_std = _safe_mean(mfcc_stds) if mfcc_stds else 5.0
        mfcc_reg_score = 1.0 - _clamp(avg_mfcc_std / 20.0, 0.0, 1.0)
        # High → regular (low variance) → more synthetic

        # B. Spectral contrast — natural speech ~10–40 dB, synthetic ~3–15 dB
        avg_contrast = _safe_mean(contrast_means) if contrast_means else 15.0
        contrast_score = 1.0 - _clamp(avg_contrast / 35.0, 0.0, 1.0)
        # High → flat spectrum → more synthetic

        # C. ZCR — elevated ZCR can indicate synthesis / noise artefacts
        #    Typical speech ZCR: 0.01–0.15; normalise over 0.15.
        zcr_score = _clamp(zcr_mean / 0.15, 0.0, 1.0)
        # High → many zero crossings → more suspicious

        # D. RMS energy anomaly — very low or very high energy is suspicious
        #    Natural speech ~0.05–0.25; map to [0,1], score deviation from centre.
        rms_norm = _clamp(rms_mean / 0.20, 0.0, 1.0)
        rms_anomaly_score = abs(rms_norm - 0.5) * 2.0
        # High → abnormal energy distribution → more suspicious

        # E. MFCC[0] energy coefficient — unusually high magnitude is suspicious
        #    Typical range: 50–350; normalise over 300.
        mfcc0 = abs(mfcc_means[0]) if mfcc_means else 150.0
        mfcc0_score = 1.0 - _clamp(mfcc0 / 300.0, 0.0, 1.0)
        # High → unusual energy → more suspicious

        # ── 3. Weighted combination → raw fake score [0, 1] ───────────
        fake_raw = (
            mfcc_reg_score    * 0.30 +   # MFCC regularity
            contrast_score    * 0.30 +   # Spectral flatness
            zcr_score         * 0.20 +   # Zero-crossing rate
            rms_anomaly_score * 0.10 +   # RMS energy anomaly
            mfcc0_score       * 0.10     # Energy coefficient
        )

        # ── 4. Sigmoid → smooth probability ───────────────────────────
        fake_probability = _sigmoid(fake_raw, midpoint=0.50, k=8.0)
        real_probability = 1.0 - fake_probability

        # ── 5. Confidence = margin from decision boundary ──────────────
        confidence = abs(fake_probability - 0.50) * 2.0

        prediction = 'FAKE' if fake_probability >= 0.50 else 'REAL'

        result: Dict[str, Any] = {
            'prediction':      prediction,
            'confidence':      round(confidence,       4),
            'fakeProbability': round(fake_probability,  4),
            'realProbability': round(real_probability,  4),
            'featuresUsed':    [
                'mfcc', 'spectralContrast',
                'zeroCrossingRate', 'rmsEnergy',
            ],
            # Internal debug scores stripped by run_inference.py before returning to Node.js
            '_debug': {
                'mfccRegScore':    round(mfcc_reg_score,    4),
                'contrastScore':   round(contrast_score,    4),
                'zcrScore':        round(zcr_score,         4),
                'rmsAnomalyScore': round(rms_anomaly_score, 4),
                'mfcc0Score':      round(mfcc0_score,       4),
                'fakeRaw':         round(fake_raw,          4),
            },
        }

        self._validate_output(result)

        log.info(
            f"Prediction: {prediction} | "
            f"Fake: {result['fakeProbability']:.4f} | "
            f"Real: {result['realProbability']:.4f} | "
            f"Confidence: {result['confidence']:.4f} | "
            f"RawScore: {fake_raw:.4f}"
        )
        return result


# ── Pure helper functions ─────────────────────────────────────────────

def _clamp(value: float, lo: float, hi: float) -> float:
    """Clamp `value` to the closed interval [lo, hi]."""
    return max(lo, min(hi, value))


def _safe_mean(values: List[float]) -> float:
    """Return the arithmetic mean of `values`, or 0.0 if the list is empty."""
    return sum(values) / len(values) if values else 0.0


def _sigmoid(x: float, midpoint: float = 0.5, k: float = 10.0) -> float:
    """
    Generalised logistic (sigmoid) function.
    Maps x → [0, 1] with the inflection point at `midpoint`.
    `k` controls steepness: larger k = sharper transition.
    """
    return 1.0 / (1.0 + math.exp(-k * (x - midpoint)))
