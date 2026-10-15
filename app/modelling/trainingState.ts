"use client";

import { useEffect, useState } from "react";
import { type ModellingCondition, isCondition } from "./modelConfig";
import { type PredictionTableRow } from "./tableRows";

export type WhiteBoxSplitFilter = {
  feature: string;
  operator: "eq" | "gte";
  value: string | number | boolean;
  branch: "yes" | "no";
};

export type WhiteBoxNodeCounts = {
  total: number;
  carnivores: number;
  herbivores: number;
  majority: "carnivore" | "herbivore";
  isPure: boolean;
};

export type WhiteBoxGiniResult = {
  feature: string;
  gini: number;
  criterion: string;
  operator: "eq" | "gte";
  value: string | number | boolean;
  yes: WhiteBoxNodeCounts;
  no: WhiteBoxNodeCounts;
  isSplittable?: boolean;
  reason?: string;
};

export type WhiteBoxTreeNode = {
  id: string;
  depth: number;
  branchLabel?: "NON" | "OUI";
  pathLabels: string[];
  filters: WhiteBoxSplitFilter[];
  availableFeatures: string[];
  counts?: WhiteBoxNodeCounts;
  selectedSplit?: WhiteBoxGiniResult;
  candidateSplits?: WhiteBoxGiniResult[];
  leftId?: string;
  rightId?: string;
  isLeaf?: boolean;
};

export type ModelTrainingResult = {
  pred_carnivores: number;
  pred_herbivores: number;
  trainingAccuracy?: number;
  predictionRows?: PredictionTableRow[];
  whiteBoxTree?: WhiteBoxTreeNode[];
};

const TRAINED_MODELS_STORAGE_KEY = "modelling:trained-model:v8";
const LEGACY_SINGLE_MODEL_WITH_ID_STORAGE_KEY = "modelling:trained-models:v7";
const LEGACY_THREE_MODEL_TRAINED_MODELS_STORAGE_KEY = "modelling:trained-models:v6";
const LEGACY_TRAINED_MODELS_WITHOUT_PREDICTIONS_STORAGE_KEY = "modelling:trained-models:v5";
const LEGACY_SESSION_TRAINED_MODELS_STORAGE_KEY = "modelling:trained-models:v4";
const LEGACY_TRAINED_MODELS_STORAGE_KEY = "modelling:trained-models:v3";

const TRAINED_MODELS_CHANGE_EVENT = "modelling:trained-models-change";

type StoredTrainingResults = Partial<Record<ModellingCondition, ModelTrainingResult>>;

function isModelTrainingResult(value: unknown): value is ModelTrainingResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const hasValidCounts = typeof candidate.pred_carnivores === "number" && typeof candidate.pred_herbivores === "number";
  const hasValidTrainingAccuracy =
    candidate.trainingAccuracy === undefined || typeof candidate.trainingAccuracy === "number";
  const hasValidPredictionRows =
    candidate.predictionRows === undefined ||
    (Array.isArray(candidate.predictionRows) &&
      candidate.predictionRows.every(
        (row) => row && typeof row === "object" && !Array.isArray(row),
      ));
  const hasValidWhiteBoxTree =
    candidate.whiteBoxTree === undefined ||
    (Array.isArray(candidate.whiteBoxTree) &&
      candidate.whiteBoxTree.every(
        (node) => node && typeof node === "object" && !Array.isArray(node),
      ));

  return hasValidCounts && hasValidTrainingAccuracy && hasValidPredictionRows && hasValidWhiteBoxTree;
}

function readStoredTrainingResults(): StoredTrainingResults {
  if (typeof window === "undefined") {
    return {};
  }

  window.sessionStorage.removeItem(LEGACY_TRAINED_MODELS_WITHOUT_PREDICTIONS_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_SINGLE_MODEL_WITH_ID_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_THREE_MODEL_TRAINED_MODELS_STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_TRAINED_MODELS_STORAGE_KEY);
  window.sessionStorage.removeItem(LEGACY_SESSION_TRAINED_MODELS_STORAGE_KEY);

  try {
    const storedResults = JSON.parse(window.sessionStorage.getItem(TRAINED_MODELS_STORAGE_KEY) ?? "{}");

    if (!storedResults || typeof storedResults !== "object" || Array.isArray(storedResults)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(storedResults).filter(
        ([condition, result]) => isCondition(condition) && isModelTrainingResult(result),
      ),
    ) as StoredTrainingResults;
  } catch {
    return {};
  }
}

export function readModelTrainingResult(condition: ModellingCondition) {
  return readStoredTrainingResults()[condition] ?? null;
}

export function markModelAsTrained(result: ModelTrainingResult, condition: ModellingCondition) {
  const storedResults = readStoredTrainingResults();

  window.sessionStorage.setItem(
    TRAINED_MODELS_STORAGE_KEY,
    JSON.stringify({
      ...storedResults,
      [condition]: result,
    }),
  );
  window.dispatchEvent(new Event(TRAINED_MODELS_CHANGE_EVENT));
}

export function useModelTrainingResult(condition: ModellingCondition) {
  const [result, setResult] = useState<ModelTrainingResult | null>(null);

  useEffect(() => {
    const update = () => setResult(readModelTrainingResult(condition));

    update();
    window.addEventListener(TRAINED_MODELS_CHANGE_EVENT, update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener(TRAINED_MODELS_CHANGE_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [condition]);

  return result;
}
