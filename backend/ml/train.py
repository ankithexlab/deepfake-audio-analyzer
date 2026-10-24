"""
train.py
─────────────────────────────────────────────────────────────────────────────
End-to-end dataset feature extraction and model training script for
Deepfake Audio Detection and Analysis System.

Dataset: E:\\projects\\mini 5th sem\\dataset
Model saved to: backend/ml/models/deepfake_model.pkl
─────────────────────────────────────────────────────────────────────────────
"""

import os
import sys
import glob
import json
import time
import random
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, VotingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

# Ensure backend scripts directory is in path for audio preprocessor
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPTS_DIR = os.path.join(BACKEND_DIR, 'src', 'scripts')
sys.path.insert(0, SCRIPTS_DIR)
import preprocess_audio

DATASET_ROOT = r"E:\projects\mini 5th sem\dataset"
OUTPUT_MODELS_DIR = os.path.join(BACKEND_DIR, 'ml', 'models')
os.makedirs(OUTPUT_MODELS_DIR, exist_ok=True)

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

def extract_features_vector(features_dict):
    """Flatten audio features dict into a 1D numpy vector (170 dimensions)."""
    vec = []
    for group_key, sub_key, length in FEATURE_SPEC:
        group = features_dict.get(group_key, {})
        val = group.get(sub_key, 0.0)
        if isinstance(val, (list, np.ndarray)):
            for i in range(length):
                vec.append(float(val[i]) if i < len(val) else 0.0)
        else:
            vec.append(float(val))
    return np.array(vec, dtype=np.float32)

def process_single_file(file_path):
    """Load audio and extract features vector."""
    try:
        y, sr, _, _ = preprocess_audio.load_and_preprocess_audio(file_path, target_sr=16000)
        feat_dict = preprocess_audio.extract_audio_features(y, sr)
        vec = extract_features_vector(feat_dict)
        return vec
    except Exception as e:
        print(f"Error processing {os.path.basename(file_path)}: {e}")
        return None

def collect_dataset_files(samples_per_subfolder=150):
    """Collect balanced audio samples from all dataset subdirectories."""
    subfolders = ['balanced', 'bg_dominant', 'voice_dominant']
    real_files = []
    fake_files = []

    for sf in subfolders:
        r_dir = os.path.join(DATASET_ROOT, 'real_voice_real_bg_4s', sf)
        f_dir = os.path.join(DATASET_ROOT, 'fake_voice_real_bg_4s', sf)

        r_matches = sorted(glob.glob(os.path.join(r_dir, '*.wav')))
        f_matches = sorted(glob.glob(os.path.join(f_dir, '*.wav')))

        # Sample deterministically with fixed seed
        rng = random.Random(42)
        r_sampled = rng.sample(r_matches, min(samples_per_subfolder, len(r_matches)))
        f_sampled = rng.sample(f_matches, min(samples_per_subfolder, len(f_matches)))

        real_files.extend(r_sampled)
        fake_files.extend(f_sampled)

    print(f"Collected dataset files: {len(real_files)} Real, {len(fake_files)} Deepfake (Total {len(real_files) + len(fake_files)})")
    return real_files, fake_files

def main():
    print("=" * 60)
    print("DEEPFAKE AUDIO DETECTOR — MODEL TRAINING PIPELINE")
    print("=" * 60)

    # Check if pre-extracted features cache exists to save time on subsequent runs
    cache_path = os.path.join(OUTPUT_MODELS_DIR, 'extracted_dataset_features_1500.npz')

    if os.path.exists(cache_path):
        print(f"Loading cached extracted features from {cache_path}...")
        data = np.load(cache_path)
        X = data['X']
        y = data['y']
        print(f"Loaded {X.shape[0]} samples with feature dimension {X.shape[1]}")
    else:
        real_files, fake_files = collect_dataset_files(samples_per_subfolder=250)
        all_tasks = [(f, 0) for f in real_files] + [(f, 1) for f in fake_files]
        random.seed(42)
        random.shuffle(all_tasks)

        X_list = []
        y_list = []
        start_time = time.time()
        print(f"Starting parallel feature extraction for {len(all_tasks)} audio files...")

        from concurrent.futures import ProcessPoolExecutor, as_completed
        
        file_paths = [t[0] for t in all_tasks]
        labels = [t[1] for t in all_tasks]

        with ProcessPoolExecutor(max_workers=10) as executor:
            future_to_label = {executor.submit(process_single_file, path): label for path, label in zip(file_paths, labels)}
            completed = 0
            for future in as_completed(future_to_label):
                label = future_to_label[future]
                completed += 1
                try:
                    vec = future.result()
                    if vec is not None:
                        X_list.append(vec)
                        y_list.append(label)
                except Exception as exc:
                    print(f"File failed with error: {exc}")

                if completed % 100 == 0 or completed == len(all_tasks):
                    elapsed = time.time() - start_time
                    pct = (completed / len(all_tasks)) * 100
                    print(f"  [{pct:5.1f}%] Extracted {completed}/{len(all_tasks)} files ({elapsed:.1f}s)")

        X = np.array(X_list, dtype=np.float32)
        y = np.array(y_list, dtype=np.int32)
        np.savez_compressed(cache_path, X=X, y=y)
        print(f"Saved feature cache to {cache_path}. Total valid samples: {len(y)}")

    # Train / Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"\nTrain set size: {X_train.shape[0]} | Test set size: {X_test.shape[0]}")

    # Standard Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Train Ensemble Classifiers
    from sklearn.ensemble import HistGradientBoostingClassifier
    print("\nTraining Ensemble AI Classifiers (HistGradientBoosting + Random Forest + Extra Trees)...")
    hgb = HistGradientBoostingClassifier(max_iter=250, learning_rate=0.08, max_depth=10, random_state=42)
    rf = RandomForestClassifier(n_estimators=220, max_depth=20, min_samples_split=3, random_state=42, n_jobs=-1)
    et = ExtraTreesClassifier(n_estimators=220, max_depth=20, min_samples_split=3, random_state=42, n_jobs=-1)

    ensemble = VotingClassifier(
        estimators=[('hgb', hgb), ('rf', rf), ('et', et)],
        voting='soft',
        n_jobs=-1
    )

    t0 = time.time()
    ensemble.fit(X_train_scaled, y_train)
    train_time = time.time() - t0
    print(f"Model training finished in {train_time:.2f} seconds.")

    # Evaluate on Test Set
    y_pred = ensemble.predict(X_test_scaled)
    y_probs = ensemble.predict_proba(X_test_scaled)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    auc = roc_auc_score(y_test, y_probs)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 60)
    print("TEST EVALUATION PERFORMANCE METRICS")
    print("=" * 60)
    print(f"Accuracy  : {acc * 100:.2f}%")
    print(f"Precision : {prec * 100:.2f}%")
    print(f"Recall    : {rec * 100:.2f}%")
    print(f"F1-Score  : {f1 * 100:.2f}%")
    print(f"ROC-AUC   : {auc:.4f}")
    print(f"Confusion Matrix (TN={cm[0][0]}, FP={cm[0][1]}, FN={cm[1][0]}, TP={cm[1][1]}):\n{cm}")
    print("=" * 60)

    # Save artifacts
    model_save_path = os.path.join(OUTPUT_MODELS_DIR, 'deepfake_model.pkl')
    scaler_save_path = os.path.join(OUTPUT_MODELS_DIR, 'scaler.pkl')
    metadata_save_path = os.path.join(OUTPUT_MODELS_DIR, 'model_metadata.json')

    joblib.dump(ensemble, model_save_path)
    joblib.dump(scaler, scaler_save_path)

    metadata = {
        'modelName': 'EnsembleNeuralDeepfakeDetector',
        'modelVersion': '1.0.0',
        'modelType': 'ensemble_rf_et_mlp',
        'featureCount': int(X.shape[1]),
        'featureGroups': ['mfcc', 'chroma', 'spectralContrast', 'zeroCrossingRate', 'rmsEnergy', 'spectralCentroid'],
        'metrics': {
            'accuracy': round(float(acc), 4),
            'precision': round(float(prec), 4),
            'recall': round(float(rec), 4),
            'f1Score': round(float(f1), 4),
            'rocAuc': round(float(auc), 4),
            'confusionMatrix': {
                'trueNegatives': int(cm[0][0]),
                'falsePositives': int(cm[0][1]),
                'falseNegatives': int(cm[1][0]),
                'truePositives': int(cm[1][1])
            }
        },
        'trainingSamples': int(X_train.shape[0]),
        'testSamples': int(X_test.shape[0]),
        'trainedAt': time.strftime('%Y-%m-%d %H:%M:%S UTC', time.gmtime()),
    }

    with open(metadata_save_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=2)

    print(f"\nArtifacts successfully exported:")
    print(f" - Model      : {model_save_path}")
    print(f" - Scaler     : {scaler_save_path}")
    print(f" - Metadata   : {metadata_save_path}")
    print("\nModel training and integration ready!")

if __name__ == '__main__':
    main()
