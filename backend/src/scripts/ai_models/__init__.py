"""
ai_models — deepfake audio detection model package.
────────────────────────────────────────────────────────────────────────
Each model must subclass BaseModel and implement:
  - load()             → Initialise weights / warm up
  - predict(features)  → Return a structured prediction dict

Model type → class mapping is managed by model_registry.py.

Currently available:
  - MockModel        (type='mock')        — Heuristic, always available
  - CNNModel         (type='cnn')         — Future: CNN on spectrogram features
  - LSTMModel        (type='lstm')        — Future: LSTM on MFCC sequences
  - TransformerModel (type='transformer') — Future: Transformer on raw features
────────────────────────────────────────────────────────────────────────
"""
