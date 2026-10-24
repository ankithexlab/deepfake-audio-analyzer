#!/usr/bin/env python3
"""
run_inference.py
────────────────────────────────────────────────────────────────────────
AI Inference Entry Point — deepfake audio detection.

Spawned by Node.js (modelRunner.js) as a child process.

Pipeline:
  1. Parse CLI arguments
  2. Load extracted features from the preprocessing JSON file
  3. Load the requested model via model_registry.py
  4. Run model.predict(features)
  5. Print a single JSON object to stdout and exit 0

On any error, prints a JSON error object to stdout and exits with code 1.
All log lines are written to stderr so stdout stays clean for JSON.

Usage (from Node.js):
  python run_inference.py \\
      --features-json /abs/path/to/features_<uuid>.json \\
      --model-type    mock \\
      --file-id       <uuid>

Stdout result shape:
  {
    "success":         true,
    "fileId":          "<uuid>",
    "prediction":      "REAL" | "FAKE",
    "confidence":      0.0–1.0,
    "fakeProbability": 0.0–1.0,
    "realProbability": 0.0–1.0,
    "modelType":       "<type>",
    "modelName":       "<name>",
    "modelVersion":    "<semver>",
    "featuresUsed":    ["mfcc", ...],
    "processingMs":    <int>
  }
────────────────────────────────────────────────────────────────────────
"""

import sys
import os
import json
import argparse
import time
import traceback
import logging

# ── Logging — write to stderr, leave stdout clean for JSON ────────────
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s [%(name)s]: %(message)s',
    datefmt='%H:%M:%S',
    stream=sys.stderr,
)
log = logging.getLogger('run_inference')

# ── Path setup ────────────────────────────────────────────────────────
# Add the scripts directory to sys.path so local packages resolve correctly
_SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, _SCRIPTS_DIR)

from model_registry import load_model  # noqa: E402 — after sys.path setup


# ── Core pipeline ─────────────────────────────────────────────────────

def run_inference(features_json_path: str, model_type: str, file_id: str) -> dict:
    """
    Execute the full inference pipeline for one audio file.

    Args:
        features_json_path (str): Absolute path to features JSON from preprocessing.
        model_type         (str): Registered model type ('mock', 'cnn', …).
        file_id            (str): File UUID — used for logging and response.

    Returns:
        dict: Structured result ready to be JSON-serialised and printed.

    Raises:
        FileNotFoundError: If the features JSON does not exist.
        ValueError:        If the JSON is missing the 'features' key.
        Exception:         Any unhandled model error propagates up.
    """
    start_ms = int(time.time() * 1000)
    log.info(f"[{file_id}] Inference requested — model_type='{model_type}'")

    # ── Load features JSON ────────────────────────────────────────────
    if not os.path.isfile(features_json_path):
        raise FileNotFoundError(
            f"Features JSON not found: {features_json_path}"
        )

    with open(features_json_path, 'r', encoding='utf-8') as fh:
        feature_data = json.load(fh)

    features = feature_data.get('features')
    if not features:
        raise ValueError(
            "Features JSON is missing the required 'features' key. "
            "Ensure preprocessing completed successfully before running inference."
        )

    log.info(
        f"[{file_id}] Features loaded — "
        f"keys: {list(features.keys())}"
    )

    # ── Load model ────────────────────────────────────────────────────
    log.info(f"[{file_id}] Loading model: '{model_type}'")
    model = load_model(model_type)
    log.info(f"[{file_id}] Model ready: {model!r}")

    # ── Run inference ─────────────────────────────────────────────────
    log.info(f"[{file_id}] Running predict()")
    raw = model.predict(features)

    end_ms = int(time.time() * 1000)
    processing_ms = end_ms - start_ms

    log.info(
        f"[{file_id}] Done — "
        f"prediction={raw['prediction']} "
        f"confidence={raw['confidence']:.4f} "
        f"fake={raw['fakeProbability']:.4f} "
        f"real={raw['realProbability']:.4f} "
        f"({processing_ms}ms)"
    )

    # Strip internal debug keys before returning to Node.js
    raw.pop('_debug', None)

    return {
        'success':         True,
        'fileId':          file_id,
        'prediction':      raw['prediction'],
        'confidence':      raw['confidence'],
        'fakeProbability': raw['fakeProbability'],
        'realProbability': raw['realProbability'],
        'modelType':       model_type,
        'modelName':       model.name,
        'modelVersion':    model.version,
        'featuresUsed':    raw.get('featuresUsed', []),
        'processingMs':    processing_ms,
    }


# ── Entry point ───────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description='Deepfake audio detection inference engine.',
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        '--features-json',
        required=True,
        help='Absolute path to the extracted features JSON file.',
    )
    parser.add_argument(
        '--model-type',
        default=os.environ.get('AI_MODEL_TYPE', 'mock'),
        help="Model type to use: 'mock', 'cnn', 'lstm', 'transformer'. "
             "Defaults to AI_MODEL_TYPE env var or 'mock'.",
    )
    parser.add_argument(
        '--file-id',
        required=True,
        help='UUID of the audio file (used for logging and response).',
    )
    args = parser.parse_args()

    try:
        result = run_inference(
            features_json_path=args.features_json,
            model_type=args.model_type,
            file_id=args.file_id,
        )
        # Single JSON object to stdout — Node.js reads this
        print(json.dumps(result, ensure_ascii=False))
        sys.exit(0)

    except Exception as exc:
        log.error(f"[{args.file_id}] Inference failed: {exc}", exc_info=True)
        error_payload = {
            'success':   False,
            'fileId':    args.file_id,
            'error':     str(exc),
            'traceback': traceback.format_exc(),
        }
        print(json.dumps(error_payload, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
