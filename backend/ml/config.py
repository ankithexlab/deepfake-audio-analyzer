"""
ml/config.py
──────────────────────────────────────────────────────────────────────
Central training configuration for reproducibility.

All hyperparameters, paths, feature definitions, and split ratios
are defined here so that every training run is fully reproducible
from this single configuration file.
──────────────────────────────────────────────────────────────────────
"""

import os
import sys
import platform

import numpy as np
import sklearn
import joblib

# ── Paths ────────────────────────────────────────────────────────────

# Root of the ml/ package
ML_ROOT = os.path.dirname(os.path.abspath(__file__))

# Root of the backend/ directory
BACKEND_ROOT = os.path.dirname(ML_ROOT)

# Dataset directories
DATASET_DIR = os.path.join(ML_ROOT, 'dataset')
DATASET_REAL_DIR = os.path.join(DATASET_DIR, 'real')
DATASET_DEEPFAKE_DIR = os.path.join(DATASET_DIR, 'deepfake')

# Model output directory
MODELS_DIR = os.path.join(ML_ROOT, 'models')

# Preprocessing script (reused from existing pipeline)
PREPROCESS_SCRIPT = os.path.join(BACKEND_ROOT, 'src', 'scripts', 'preprocess_audio.py')


# ── Reproducibility ──────────────────────────────────────────────────

RANDOM_SEED = 42


# ── Dataset Split Ratios ─────────────────────────────────────────────

TRAIN_RATIO = 0.70
VAL_RATIO = 0.15
TEST_RATIO = 0.15


# ── Label Mapping ────────────────────────────────────────────────────

LABEL_REAL = 0
LABEL_DEEPFAKE = 1

LABEL_MAP = {
    LABEL_REAL: 'REAL',
    LABEL_DEEPFAKE: 'DEEPFAKE',
}

LABEL_MAP_REVERSE = {v: k for k, v in LABEL_MAP.items()}


# ── Feature Configuration ────────────────────────────────────────────
# Defines the exact order and structure of the 166-dimensional feature vector
# extracted from each features_<fileId>.json file.
#
# Structure:
#   mfcc.mean       → 20 floats
#   mfcc.std        → 20 floats
#   mfcc.min        → 20 floats
#   mfcc.max        → 20 floats
#   mfcc.delta_mean → 20 floats
#   mfcc.delta2_mean→ 20 floats
#   chroma.mean     → 12 floats
#   chroma.std      → 12 floats
#   spectralContrast.mean → 7 floats
#   spectralContrast.std  → 7 floats
#   zeroCrossingRate.mean → 1 float
#   zeroCrossingRate.std  → 1 float
#   zeroCrossingRate.max  → 1 float
#   zeroCrossingRate.min  → 1 float
#   rmsEnergy.mean  → 1 float
#   rmsEnergy.std   → 1 float
#   rmsEnergy.max   → 1 float
#   rmsEnergy.min   → 1 float
#
# Total: 120 + 24 + 14 + 4 + 4 = 166 features

FEATURE_SPEC = [
    # (json_key, sub_key, expected_length)
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
]

EXPECTED_FEATURE_DIM = sum(length for _, _, length in FEATURE_SPEC)  # 166


def get_feature_names():
    """
    Return an ordered list of human-readable feature names matching the
    feature vector layout.

    Returns:
        list[str]: 166 feature names.
    """
    names = []
    for key, sub_key, length in FEATURE_SPEC:
        if length == 1:
            names.append(f'{key}_{sub_key}')
        else:
            for i in range(length):
                names.append(f'{key}_{sub_key}_{i}')
    return names


# ── Model Hyperparameters ────────────────────────────────────────────

BASELINE_MODEL_PARAMS = {
    'n_estimators': 200,
    'max_depth': 20,
    'min_samples_split': 5,
    'min_samples_leaf': 2,
    'max_features': 'sqrt',
    'class_weight': 'balanced',
    'random_state': RANDOM_SEED,
    'n_jobs': -1,
}


# ── Artifact Filenames ───────────────────────────────────────────────

MODEL_FILENAME = 'deepfake_model.pkl'
SCALER_FILENAME = 'scaler.pkl'
LABEL_MAPPING_FILENAME = 'label_mapping.json'
MODEL_METADATA_FILENAME = 'model_metadata.json'
TRAINING_CONFIG_FILENAME = 'training_config.json'
METRICS_FILENAME = 'model_metrics.json'
CONFUSION_MATRIX_FILENAME = 'confusion_matrix.png'
ROC_CURVE_FILENAME = 'roc_curve.png'


# ── Environment Info ─────────────────────────────────────────────────

def get_environment_info():
    """Return a dict of Python/library versions for reproducibility logging."""
    return {
        'python_version': sys.version,
        'platform': platform.platform(),
        'numpy_version': np.__version__,
        'sklearn_version': sklearn.__version__,
        'joblib_version': joblib.__version__,
    }
