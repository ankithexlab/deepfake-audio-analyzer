"""
ai_models/trained_model.py
────────────────────────────────────────────────────────────────────────
TrainedModel — Trained AI Classifier for Deepfake Audio Detection.

Loads the trained ensemble model (HistGradientBoosting + Random Forest +
Extra Trees) and StandardScaler trained on the project dataset.

Features extracted: 170 dimensions
  • MFCC statistics (mean, std, min, max, delta, delta2) - 120 features
  • Chroma STFT statistics (mean, std)                   - 24 features
  • Spectral Contrast (mean, std)                        - 14 features
  • Zero Crossing Rate (mean, std, max, min)             - 4 features
  • RMS Energy (mean, std, max, min)                     - 4 features
  • Spectral Centroid (mean, std, max, min)              - 4 features
────────────────────────────────────────────────────────────────────────
"""

import os
import sys
import logging
from typing import Dict, Any, List
import numpy as np
import joblib

from .base_model import BaseModel

log = logging.getLogger('trained_model')

FEATURE_SPEC = [
    ('mfcc', 'mean', 20),
    ('mfcc', 'std', 20),
    ('mfcc', 'min', 20),
    ('mfcc', 'max', 20),
    ('mfcc', 'delta_mean', 20),
    ('mfcc', 'delta2_mean', 20),
    ('chroma', 'mean', 12),
    ('chroma', 'std', 12),
    ('spectralContrast', 'mean', 7),
    ('spectralContrast', 'std', 7),
    ('zeroCrossingRate', 'mean', 1),
    ('zeroCrossingRate', 'std', 1),
    ('zeroCrossingRate', 'max', 1),
    ('zeroCrossingRate', 'min', 1),
    ('rmsEnergy', 'mean', 1),
    ('rmsEnergy', 'std', 1),
    ('rmsEnergy', 'max', 1),
    ('rmsEnergy', 'min', 1),
    ('spectralCentroid', 'mean', 1),
    ('spectralCentroid', 'std', 1),
    ('spectralCentroid', 'max', 1),
    ('spectralCentroid', 'min', 1),
]


class TrainedModel(BaseModel):
    """
    Trained AI model for binary deepfake audio classification.
    Predicts REAL VOICE vs DEEPFAKE SYNTHETIC VOICE.
    """

    def __init__(self) -> None:
        super().__init__(name='EnsembleNeuralClassifier', version='1.0.0')
        self.model = None
        self.scaler = None

    def load(self, model_path: str = None) -> None:
        """
        Load trained model weights and scaler from disk.
        """
        if model_path is None:
            # Default location: backend/ml/models/deepfake_model.pkl
            scripts_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            backend_dir = os.path.dirname(os.path.dirname(scripts_dir))
            model_path = os.path.join(backend_dir, 'ml', 'models', 'deepfake_model.pkl')

        scaler_path = os.path.join(os.path.dirname(model_path), 'scaler.pkl')

        if not os.path.isfile(model_path):
            raise FileNotFoundError(f"Model file not found: {model_path}")
        if not os.path.isfile(scaler_path):
            raise FileNotFoundError(f"Scaler file not found: {scaler_path}")

        log.info(f"Loading trained model from {model_path}...")
        self.model = joblib.load(model_path)
        log.info(f"Loading scaler from {scaler_path}...")
        self.scaler = joblib.load(scaler_path)

        self.loaded = True
        log.info(f"TrainedModel '{self.name}' v{self.version} loaded successfully.")

    def _extract_vector(self, features: Dict[str, Any]) -> np.ndarray:
        """Flatten features dict to 170-dim numpy array matching training spec."""
        vec: List[float] = []
        for group_key, sub_key, length in FEATURE_SPEC:
            group = features.get(group_key, {})
            val = group.get(sub_key, 0.0)
            if isinstance(val, (list, np.ndarray)):
                for i in range(length):
                    vec.append(float(val[i]) if i < len(val) else 0.0)
            else:
                vec.append(float(val))
        return np.array([vec], dtype=np.float32)

    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute prediction on extracted audio features.
        """
        self._require_loaded()

        X_raw = self._extract_vector(features)
        X_scaled = self.scaler.transform(X_raw)

        # Predict probabilities: class 0 = REAL, class 1 = DEEPFAKE
        probs = self.model.predict_proba(X_scaled)[0]
        real_prob = float(probs[0])
        fake_prob = float(probs[1])

        prediction = 'FAKE' if fake_prob >= 0.50 else 'REAL'
        confidence = round(fake_prob if prediction == 'FAKE' else real_prob, 4)

        result: Dict[str, Any] = {
            'prediction': prediction,
            'confidence': confidence,
            'fakeProbability': round(fake_prob, 4),
            'realProbability': round(real_prob, 4),
            'featuresUsed': [
                'mfcc', 'chroma', 'spectralContrast',
                'zeroCrossingRate', 'rmsEnergy', 'spectralCentroid'
            ],
        }

        self._validate_output(result)

        log.info(
            f"Prediction: {prediction} | "
            f"Fake: {result['fakeProbability']:.4f} | "
            f"Real: {result['realProbability']:.4f} | "
            f"Confidence: {result['confidence']:.4f}"
        )
        return result
