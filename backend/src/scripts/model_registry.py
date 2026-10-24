"""
model_registry.py
────────────────────────────────────────────────────────────────────────
Dynamic model loader for the AI detection engine.

Maps model-type strings to their implementing class, imports them at
runtime, and returns a ready-to-use model instance.

On any import or instantiation failure for a non-mock type, the registry
logs the error and automatically falls back to MockModel so the API
continues to serve predictions.

Supported model types:
  'mock'        → ai_models.mock_model.MockModel        (always available)
  'cnn'         → ai_models.cnn_model.CNNModel           (future)
  'lstm'        → ai_models.lstm_model.LSTMModel         (future)
  'transformer' → ai_models.transformer_model.TransformerModel (future)

Adding a new model:
  1. Create ai_models/<name>_model.py extending BaseModel.
  2. Add an entry to MODEL_REGISTRY below.
  3. Set AI_MODEL_TYPE=<name> in .env.
────────────────────────────────────────────────────────────────────────
"""

import importlib
import logging
import os
from typing import Optional

log = logging.getLogger('model_registry')

# ── Registry ─────────────────────────────────────────────────────────
# Maps type string → (dotted module path, class name)
MODEL_REGISTRY: dict = {
    'trained':     ('ai_models.trained_model',     'TrainedModel'),
    'ensemble':    ('ai_models.trained_model',     'TrainedModel'),
    'classifier':  ('ai_models.trained_model',     'TrainedModel'),
    'mock':        ('ai_models.mock_model',        'MockModel'),
    'cnn':         ('ai_models.cnn_model',         'CNNModel'),
    'lstm':        ('ai_models.lstm_model',        'LSTMModel'),
    'transformer': ('ai_models.transformer_model', 'TransformerModel'),
}


def load_model(model_type: Optional[str] = None):
    """
    Dynamically load, instantiate, and return a ready model.

    Args:
        model_type (str, optional): One of the keys in MODEL_REGISTRY.
                                    Falls back to the AI_MODEL_TYPE environment
                                    variable, and ultimately to 'mock'.

    Returns:
        BaseModel: An instance of the requested model with load() called.

    Raises:
        RuntimeError: If even MockModel fails to load (should never happen).
    """
    # Resolve model type
    if model_type is None:
        model_type = os.environ.get('AI_MODEL_TYPE', 'trained')

    model_type = model_type.strip().lower()

    # Validate
    if model_type not in MODEL_REGISTRY:
        log.warning(
            f"Unknown model type '{model_type}'. "
            f"Valid types: {sorted(MODEL_REGISTRY.keys())}. "
            f"Falling back to 'mock'."
        )
        model_type = 'mock'

    module_path, class_name = MODEL_REGISTRY[model_type]

    log.info(f"Loading model: type='{model_type}' class='{class_name}' module='{module_path}'")

    try:
        module = importlib.import_module(module_path)
        model_class = getattr(module, class_name)
    except (ImportError, AttributeError) as exc:
        return _fallback_to_mock(model_type, class_name, exc)

    # Determine optional model weights path
    model_path: Optional[str] = os.environ.get('AI_MODEL_PATH') or None

    try:
        instance = model_class()
        instance.load(model_path)
    except Exception as exc:
        if model_type == 'mock':
            # MockModel failing is a hard error — re-raise immediately.
            raise RuntimeError(f"Critical: MockModel failed to load: {exc}") from exc
        return _fallback_to_mock(model_type, class_name, exc)

    log.info(f"Model ready: {instance!r}")
    return instance


# ── Private helpers ───────────────────────────────────────────────────

def _fallback_to_mock(failed_type: str, failed_class: str, exc: Exception):
    """
    Log the failure and return a loaded MockModel instance.

    Args:
        failed_type  (str):       The model type that failed.
        failed_class (str):       The class name that failed.
        exc          (Exception): The exception that caused the failure.

    Returns:
        MockModel: A ready MockModel instance.
    """
    log.error(
        f"Failed to load '{failed_type}' ({failed_class}): {exc}. "
        f"Activating MockModel fallback."
    )
    from ai_models.mock_model import MockModel
    fallback = MockModel()
    fallback.load()
    log.warning(f"Fallback active: {fallback!r}")
    return fallback
