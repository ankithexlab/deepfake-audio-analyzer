"""
backend/ml/evaluate_model_quality.py
Audit, 5-Fold Cross Validation & Safe Candidate Model Evaluation
"""

import os
import sys
import json
import joblib
import numpy as np
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_validate
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, confusion_matrix
)
from sklearn.ensemble import (
    RandomForestClassifier, ExtraTreesClassifier,
    HistGradientBoostingClassifier, VotingClassifier
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, 'models')
CACHE_PATH = os.path.join(MODELS_DIR, 'extracted_dataset_features_1500.npz')

def evaluate_predictions(y_true, y_pred, y_probs):
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred)
    rec = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    auc = roc_auc_score(y_true, y_probs)
    cm = confusion_matrix(y_true, y_pred)
    return {
        'accuracy': float(acc),
        'precision': float(prec),
        'recall': float(rec),
        'f1': float(f1),
        'roc_auc': float(auc),
        'confusion_matrix': {
            'tn': int(cm[0][0]),
            'fp': int(cm[0][1]),
            'fn': int(cm[1][0]),
            'tp': int(cm[1][1])
        }
    }

def main():
    print("=" * 70, flush=True)
    print("AI MODEL QUALITY, EVALUATION REPRODUCTION & CANDIDATE COMPARISON", flush=True)
    print("=" * 70, flush=True)

    # 1. Load Dataset Features
    data = np.load(CACHE_PATH)
    X = data['X']
    y = data['y']
    print(f"Loaded features cache: {X.shape[0]} samples, {X.shape[1]} dimensions", flush=True)
    real_cnt = int(np.sum(y == 0))
    fake_cnt = int(np.sum(y == 1))
    print(f"Class Distribution: REAL = {real_cnt}, FAKE = {fake_cnt}", flush=True)

    # 2. Stratified Split (80% Train, 20% Holdout Test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )
    print(f"Split: Train = {X_train.shape[0]} samples, Holdout Test = {X_test.shape[0]} samples", flush=True)

    # 3. Load Active Scaler & Scale
    scaler = joblib.load(os.path.join(MODELS_DIR, 'scaler.pkl'))
    X_train_scaled = scaler.transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 4. Evaluate Active Baseline Model (deepfake_model.pkl)
    active_model = joblib.load(os.path.join(MODELS_DIR, 'deepfake_model.pkl'))
    active_pred = active_model.predict(X_test_scaled)
    active_probs = active_model.predict_proba(X_test_scaled)[:, 1]
    active_metrics = evaluate_predictions(y_test, active_pred, active_probs)

    print("\n[1] ACTIVE BASELINE MODEL (v1.0.0) ON HOLDOUT TEST SET:", flush=True)
    print(f"  Accuracy  : {active_metrics['accuracy'] * 100:.2f}%", flush=True)
    print(f"  Precision : {active_metrics['precision'] * 100:.2f}%", flush=True)
    print(f"  Recall    : {active_metrics['recall'] * 100:.2f}%", flush=True)
    print(f"  F1-Score  : {active_metrics['f1'] * 100:.2f}%", flush=True)
    print(f"  ROC-AUC   : {active_metrics['roc_auc']:.4f}", flush=True)
    cm_a = active_metrics['confusion_matrix']
    print(f"  Confusion Matrix: TN={cm_a['tn']}, FP={cm_a['fp']}, FN={cm_a['fn']}, TP={cm_a['tp']}", flush=True)

    # 5. Fast Candidate Model: HistGradientBoosting + ExtraTrees + Random Forest
    print("\n[2] FITTING CANDIDATE ENSEMBLE MODEL (HGB + RF + ET)...", flush=True)
    hgb = HistGradientBoostingClassifier(
        max_iter=120, learning_rate=0.08, max_depth=6, min_samples_leaf=25,
        l2_regularization=2.0, random_state=42
    )
    rf = RandomForestClassifier(
        n_estimators=120, max_depth=12, min_samples_split=6,
        max_features='sqrt', random_state=42
    )
    et = ExtraTreesClassifier(
        n_estimators=120, max_depth=12, min_samples_split=6,
        max_features='sqrt', random_state=42
    )

    candidate_ensemble = VotingClassifier(
        estimators=[('hgb', hgb), ('rf', rf), ('et', et)],
        voting='soft'
    )

    candidate_ensemble.fit(X_train_scaled, y_train)
    print("  Candidate fit complete.", flush=True)

    # 6. Evaluate Candidate Model on Holdout Test Set
    cand_pred = candidate_ensemble.predict(X_test_scaled)
    cand_probs = candidate_ensemble.predict_proba(X_test_scaled)[:, 1]
    cand_metrics = evaluate_predictions(y_test, cand_pred, cand_probs)

    print("\n[3] CANDIDATE MODEL (v1.1.0) ON HOLDOUT TEST SET:", flush=True)
    print(f"  Accuracy  : {cand_metrics['accuracy'] * 100:.2f}%", flush=True)
    print(f"  Precision : {cand_metrics['precision'] * 100:.2f}%", flush=True)
    print(f"  Recall    : {cand_metrics['recall'] * 100:.2f}%", flush=True)
    print(f"  F1-Score  : {cand_metrics['f1'] * 100:.2f}%", flush=True)
    print(f"  ROC-AUC   : {cand_metrics['roc_auc']:.4f}", flush=True)
    cm_c = cand_metrics['confusion_matrix']
    print(f"  Confusion Matrix: TN={cm_c['tn']}, FP={cm_c['fp']}, FN={cm_c['fn']}, TP={cm_c['tp']}", flush=True)

    # 7. 5-Fold Stratified Cross-Validation on Candidate
    print("\n[4] RUNNING 5-FOLD STRATIFIED CV ON CANDIDATE (Train Set, N=1198)...", flush=True)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_res_cand = cross_validate(candidate_ensemble, X_train_scaled, y_train, cv=cv, scoring=['accuracy', 'roc_auc'])
    cand_cv_acc_mean = cv_res_cand['test_accuracy'].mean()
    cand_cv_acc_std = cv_res_cand['test_accuracy'].std()
    cand_cv_auc_mean = cv_res_cand['test_roc_auc'].mean()
    cand_cv_auc_std = cv_res_cand['test_roc_auc'].std()
    print(f"  Candidate 5-Fold CV Accuracy: {cand_cv_acc_mean * 100:.2f}% (+/- {cand_cv_acc_std * 100:.2f}%)", flush=True)
    print(f"  Candidate 5-Fold CV ROC-AUC : {cand_cv_auc_mean:.4f} (+/- {cand_cv_auc_std:.4f})", flush=True)

    # 8. Save Candidate Artifact Separately (Preserving Original deepfake_model.pkl!)
    cand_path = os.path.join(MODELS_DIR, 'candidate_model.pkl')
    cand_meta_path = os.path.join(MODELS_DIR, 'candidate_metadata.json')
    joblib.dump(candidate_ensemble, cand_path)

    cand_meta = {
        'modelName': 'CandidateEnsemble_HGB_RF_ET',
        'modelVersion': '1.1.0-candidate',
        'status': 'candidate_evaluated',
        'holdoutTest': cand_metrics,
        'crossValidation': {
            'accuracyMean': round(float(cand_cv_acc_mean), 4),
            'accuracyStd': round(float(cand_cv_acc_std), 4),
            'rocAucMean': round(float(cand_cv_auc_mean), 4),
            'rocAucStd': round(float(cand_cv_auc_std), 4)
        },
        'comparisonWithActive': {
            'accuracyDelta': round(cand_metrics['accuracy'] - active_metrics['accuracy'], 4),
            'rocAucDelta': round(cand_metrics['roc_auc'] - active_metrics['roc_auc'], 4),
        }
    }
    with open(cand_meta_path, 'w', encoding='utf-8') as f:
        json.dump(cand_meta, f, indent=2)

    print("\n" + "=" * 70, flush=True)
    print("COMPARATIVE SUMMARY TABLE", flush=True)
    print("=" * 70, flush=True)
    print(f"{'Metric':<20} | {'Active (v1.0.0)':<18} | {'Candidate (v1.1.0)':<18} | {'Delta':<10}", flush=True)
    print("-" * 70, flush=True)
    print(f"{'Test Accuracy':<20} | {active_metrics['accuracy']*100:6.2f}%            | {cand_metrics['accuracy']*100:6.2f}%            | {(cand_metrics['accuracy']-active_metrics['accuracy'])*100:+5.2f}%", flush=True)
    print(f"{'Test Precision':<20} | {active_metrics['precision']*100:6.2f}%            | {cand_metrics['precision']*100:6.2f}%            | {(cand_metrics['precision']-active_metrics['precision'])*100:+5.2f}%", flush=True)
    print(f"{'Test Recall':<20} | {active_metrics['recall']*100:6.2f}%            | {cand_metrics['recall']*100:6.2f}%            | {(cand_metrics['recall']-active_metrics['recall'])*100:+5.2f}%", flush=True)
    print(f"{'Test F1-Score':<20} | {active_metrics['f1']*100:6.2f}%            | {cand_metrics['f1']*100:6.2f}%            | {(cand_metrics['f1']-active_metrics['f1'])*100:+5.2f}%", flush=True)
    print(f"{'Test ROC-AUC':<20} | {active_metrics['roc_auc']:6.4f}             | {cand_metrics['roc_auc']:6.4f}             | {(cand_metrics['roc_auc']-active_metrics['roc_auc']):+6.4f}", flush=True)
    print("=" * 70, flush=True)
    print(f"Candidate artifact saved to: {cand_path}", flush=True)
    print("Active deepfake_model.pkl is STRICTLY UNTOUCHED AND REMAINS ACTIVE.", flush=True)

if __name__ == '__main__':
    main()
