#!/usr/bin/env python3
"""
Train a fraud detection model and export lightweight artifacts for backend scoring.

Usage:
  python backend/ai-services/fraud/train_model.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.metrics import precision_recall_curve
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "historical_fraud_data.csv"
OUTPUT_DIR = ROOT / "model-artifacts"
OUTPUT_PATH = OUTPUT_DIR / "fraud-model.json"

FEATURE_COLUMNS = [
    "accountAgeDays",
    "failedLoginAttempts",
    "loginCount",
    "isKycVerified",
    "listingPriceAnomaly",
    "listingContentRisk",
    "paymentAmountAnomaly",
    "rapidPaymentVelocity",
    "paymentFailureRate",
    "newPaymentMethodRisk",
]


def build_synthetic_data(size: int = 5000) -> pd.DataFrame:
    rng = np.random.default_rng(seed=42)
    data = pd.DataFrame(
        {
            "accountAgeDays": rng.integers(1, 1200, size=size),
            "failedLoginAttempts": rng.integers(0, 12, size=size),
            "loginCount": rng.integers(1, 500, size=size),
            "isKycVerified": rng.integers(0, 2, size=size),
            "listingPriceAnomaly": rng.uniform(0, 1.5, size=size),
            "listingContentRisk": rng.uniform(0, 1, size=size),
            "paymentAmountAnomaly": rng.uniform(0, 2, size=size),
            "rapidPaymentVelocity": rng.uniform(0, 1, size=size),
            "paymentFailureRate": rng.uniform(0, 1, size=size),
            "newPaymentMethodRisk": rng.integers(0, 2, size=size),
        }
    )

    risk_score = (
        0.02 * (10 - np.clip(data["accountAgeDays"] / 120, 0, 10))
        + 0.09 * data["failedLoginAttempts"]
        + 0.04 * data["listingPriceAnomaly"]
        + 0.06 * data["listingContentRisk"]
        + 0.08 * data["paymentAmountAnomaly"]
        + 0.07 * data["rapidPaymentVelocity"]
        + 0.08 * data["paymentFailureRate"]
        + 0.05 * data["newPaymentMethodRisk"]
        + 0.03 * (1 - data["isKycVerified"])
    )
    risk_score += rng.normal(0, 0.08, size=size)
    data["label"] = (risk_score > 0.7).astype(int)
    return data


def normalize_importances(feature_importances: np.ndarray) -> list[float]:
    total = float(feature_importances.sum())
    if total <= 0:
        return [1.0 / len(feature_importances)] * len(feature_importances)
    return (feature_importances / total).tolist()


def compute_thresholds(y_true: np.ndarray, y_prob: np.ndarray) -> tuple[float, float]:
    precision, recall, thresholds = precision_recall_curve(y_true, y_prob)
    if thresholds.size == 0:
        return 45.0, 75.0

    best_review_threshold = 0.45
    best_block_threshold = 0.75

    for p, r, t in zip(precision[:-1], recall[:-1], thresholds):
        if p >= 0.7 and r >= 0.35:
            best_review_threshold = float(t)
            break

    for p, _r, t in zip(precision[:-1], recall[:-1], thresholds):
        if p >= 0.9:
            best_block_threshold = float(t)
            break

    return best_review_threshold * 100, best_block_threshold * 100


def main() -> None:
    if DATA_PATH.exists():
        data = pd.read_csv(DATA_PATH)
    else:
        print(f"[fraud-train] No dataset found at {DATA_PATH}, generating synthetic data.")
        data = build_synthetic_data()

    missing = [column for column in FEATURE_COLUMNS + ["label"] if column not in data.columns]
    if missing:
        raise ValueError(
            f"Dataset missing required columns: {missing}. "
            f"Expected features={FEATURE_COLUMNS} and label."
        )

    x = data[FEATURE_COLUMNS]
    y = data["label"].astype(int)

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.2, random_state=42, stratify=y
    )

    model = XGBClassifier(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.0,
        objective="binary:logistic",
        eval_metric="logloss",
        random_state=42,
    )
    model.fit(x_train, y_train)

    y_prob = model.predict_proba(x_test)[:, 1]
    threshold_review, threshold_block = compute_thresholds(
        y_test.to_numpy(), y_prob
    )
    normalized = normalize_importances(model.feature_importances_)
    weights = {
        feature_name: float(round((importance - 0.1) * 8, 4))
        for feature_name, importance in zip(FEATURE_COLUMNS, normalized)
    }

    artifact = {
        "modelVersion": "xgb-fraud-v1",
        "trainedAt": pd.Timestamp.utcnow().isoformat(),
        "thresholdReview": round(float(threshold_review), 2),
        "thresholdBlock": round(float(max(threshold_block, threshold_review + 10)), 2),
        "featureWeights": weights,
        "metrics": {
            "testRecords": int(len(y_test)),
            "fraudRate": round(float(y.mean()), 4),
        },
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    print(f"[fraud-train] Wrote artifact to: {OUTPUT_PATH}")
    print(json.dumps(artifact["metrics"], indent=2))


if __name__ == "__main__":
    main()
