"""
ai_models/base_model.py
────────────────────────────────────────────────────────────────────────
Abstract base class for all AI deepfake detection models.

Every model — CNN, LSTM, Transformer, or the heuristic Mock — must
subclass BaseModel and implement both `load()` and `predict()`.

Required predict() output shape:
  {
    'prediction'     : str   — "REAL" or "FAKE"
    'confidence'     : float — 0.0 to 1.0 (certainty of prediction)
    'fakeProbability': float — 0.0 to 1.0
    'realProbability': float — 0.0 to 1.0
    'featuresUsed'   : list  — feature keys used in the prediction
  }
────────────────────────────────────────────────────────────────────────
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List


class BaseModel(ABC):
    """
    Abstract base class for deepfake audio detection models.

    Attributes:
        name    (str):  Human-readable model identifier.
        version (str):  Semantic version string (e.g. '1.0.0').
        loaded  (bool): Whether load() has been called successfully.
    """

    def __init__(self, name: str = 'BaseModel', version: str = '0.0.0') -> None:
        self.name    = name
        self.version = version
        self.loaded  = False

    # ── Abstract interface ────────────────────────────────────────────

    @abstractmethod
    def load(self, model_path: str = None) -> None:
        """
        Load model weights or initialise the model.

        Args:
            model_path (str, optional): Path to serialised weights file
                                        (e.g. .pt, .h5, .onnx).
                                        Pass None for in-memory / heuristic models.

        Raises:
            FileNotFoundError: If model_path is set but the file does not exist.
            RuntimeError:      If the model fails to initialise.
        """
        ...

    @abstractmethod
    def predict(self, features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Run inference on extracted audio features.

        Args:
            features (dict): Acoustic feature dict produced by preprocess_audio.py.
                             Expected keys:
                               - mfcc             → {mean, std, min, max, delta_mean, delta2_mean}
                               - chroma           → {mean, std}
                               - spectralContrast → {mean, std}
                               - zeroCrossingRate → {mean, std, max, min}
                               - rmsEnergy        → {mean, std, max, min}
                               - waveformPoints   → list[float]

        Returns:
            dict: Prediction result containing:
                  'prediction'      (str)   — "REAL" or "FAKE"
                  'confidence'      (float) — 0.0 to 1.0
                  'fakeProbability' (float) — 0.0 to 1.0
                  'realProbability' (float) — 0.0 to 1.0
                  'featuresUsed'    (list)  — feature keys used

        Raises:
            RuntimeError: If load() has not been called yet.
            ValueError:   If required features are missing.
        """
        ...

    # ── Shared helpers ────────────────────────────────────────────────

    def _validate_output(self, output: Dict[str, Any]) -> None:
        """
        Validate that predict() returned all required keys with valid values.

        Raises:
            ValueError: On missing keys or an invalid prediction string.
        """
        required: set = {'prediction', 'confidence', 'fakeProbability', 'realProbability'}
        missing = required - set(output.keys())
        if missing:
            raise ValueError(
                f"{self.__class__.__name__}.predict() is missing required keys: {missing}"
            )
        if output['prediction'] not in ('REAL', 'FAKE'):
            raise ValueError(
                f"prediction must be 'REAL' or 'FAKE', got: {output['prediction']!r}"
            )
        for key in ('confidence', 'fakeProbability', 'realProbability'):
            val = output[key]
            if not (0.0 <= val <= 1.0):
                raise ValueError(
                    f"{key} must be in [0.0, 1.0], got: {val}"
                )

    def _require_loaded(self) -> None:
        """Raise RuntimeError if the model has not been loaded."""
        if not self.loaded:
            raise RuntimeError(
                f"{self.__class__.__name__} is not loaded. Call load() before predict()."
            )

    # ── Dunder ────────────────────────────────────────────────────────

    def __repr__(self) -> str:
        return (
            f"<{self.__class__.__name__} "
            f"name={self.name!r} "
            f"version={self.version!r} "
            f"loaded={self.loaded}>"
        )
