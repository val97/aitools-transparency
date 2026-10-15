"use client";

import { useSyncExternalStore } from "react";
import { type ModellingCondition } from "@/app/modelling/modelConfig";

export type ExperimentCondition = "C1" | "C2" | "C3" | "C4" | "C5" | "C6" | "C7";
export type ExperimentStep = "data_labelling" | "feature_selection" | "modelling" | "evaluation";

const EXPERIMENT_CONDITION_STORAGE_KEY = "mobots:experiment-condition";
const EXPERIMENT_CONDITION_CHANGE_EVENT = "mobots:experiment-condition-change";

export const EXPERIMENT_CONDITIONS: {
  id: ExperimentCondition;
  label: string;
}[] = [
  { id: "C1", label: "C1 (Glass-Box)" },
  { id: "C2", label: "C2 (Grey-Box)" },
  { id: "C3", label: "C3 (Black-Box)" },
  { id: "C4", label: "C4 (Data shown, model hidden, same actions)" },
  { id: "C5", label: "C5 (Data hidden, model revealed after predicting, same actions)" },
  { id: "C6", label: "C6 (Data shown, model revealed after predicting, same actions)" },
  { id: "C7", label: "C7 (Data hidden, model hidden, same actions)" },
];

export function isExperimentCondition(value: string | null): value is ExperimentCondition {
  return EXPERIMENT_CONDITIONS.some((condition) => condition.id === value);
}

export function saveExperimentCondition(condition: ExperimentCondition) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(EXPERIMENT_CONDITION_STORAGE_KEY, condition);
  window.dispatchEvent(new Event(EXPERIMENT_CONDITION_CHANGE_EVENT));
}

export function readExperimentCondition() {
  if (typeof window === "undefined") {
    return null;
  }

  const storedCondition = window.sessionStorage.getItem(EXPERIMENT_CONDITION_STORAGE_KEY);

  return isExperimentCondition(storedCondition) ? storedCondition : null;
}

export function clearExperimentCondition() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(EXPERIMENT_CONDITION_STORAGE_KEY);
  window.dispatchEvent(new Event(EXPERIMENT_CONDITION_CHANGE_EVENT));
}

function subscribeToExperimentCondition(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(EXPERIMENT_CONDITION_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(EXPERIMENT_CONDITION_CHANGE_EVENT, onStoreChange);
  };
}

export function useExperimentCondition() {
  return useSyncExternalStore(subscribeToExperimentCondition, readExperimentCondition, () => null);
}

export function conditionForStep(
  experimentCondition: ExperimentCondition | null,
  step: ExperimentStep,
): ModellingCondition | null {
  if (!experimentCondition) {
    return null;
  }

  if (experimentCondition === "C1") {
    return "WB";
  }

  if (experimentCondition === "C2") {
    return step === "modelling" || step === "evaluation" ? "BB" : "WB";
  }

  return "BB";
}

// C4 to C7 hold agency constant: nobody labels or picks features (the
// archaeologists prepared the data), and everybody trains the same hidden
// Gini tree, sees its outputs and guesses which features it uses. They form a
// 2x2: the data preparation is shown (C4, C6) or hidden (C5, C7), and the
// model is opened after the guess (C5, C6) or stays closed (C4, C7).
const SAME_ACTIONS_CONDITIONS: ExperimentCondition[] = ["C4", "C5", "C6", "C7"];

export function isSameActionsCondition(experimentCondition: ExperimentCondition | null) {
  return experimentCondition !== null && SAME_ACTIONS_CONDITIONS.includes(experimentCondition);
}

export type DataExposure = "exposed" | "hidden";

export function dataExposure(experimentCondition: ExperimentCondition | null): DataExposure | null {
  if (experimentCondition === "C4" || experimentCondition === "C6") {
    return "exposed";
  }

  if (experimentCondition === "C5" || experimentCondition === "C7") {
    return "hidden";
  }

  return null;
}

// Whether the student can open tables showing each training dinosaur's label.
export function showsTrainingDataTables(experimentCondition: ExperimentCondition | null) {
  return dataExposure(experimentCondition) !== "hidden";
}

// Whether the student sees the decision tree (built in C1, revealed in C5 and C6).
export function isModelOpen(experimentCondition: ExperimentCondition | null) {
  return experimentCondition === "C1" || revealsModelAfterPredicting(experimentCondition);
}

// Whether the black-box model is trained on the selected (here: prepared)
// features instead of the fixed black-box feature set.
export function blackBoxUsesSelectedFeatures(experimentCondition: ExperimentCondition | null) {
  return isSameActionsCondition(experimentCondition);
}

// C4 to C7 train the same greedy Gini tree behind the black-box card, so
// all four conditions get exactly the same model.
export function buildsHiddenGiniTree(experimentCondition: ExperimentCondition | null) {
  return isSameActionsCondition(experimentCondition);
}

// Whether the selected features are shown next to a black-box model.
export function showsSelectedFeaturesWithBlackBox(experimentCondition: ExperimentCondition | null) {
  return experimentCondition === "C2" || isSameActionsCondition(experimentCondition);
}

// Students see what the hidden model predicted for each training dinosaur,
// then guess which features it uses.
export function showsTrainingOutputs(experimentCondition: ExperimentCondition | null) {
  return isSameActionsCondition(experimentCondition);
}

// C5 and C6: after the feature guess, the tree is opened, first its
// questions and then the Gini impurity behind each choice.
export function revealsModelAfterPredicting(experimentCondition: ExperimentCondition | null) {
  return experimentCondition === "C5" || experimentCondition === "C6";
}

// C4 to C7 evaluate on one new dinosaur at a time; C5 and C6 also follow each
// dinosaur down the tree they saw during training.
export function evaluatesCardByCard(experimentCondition: ExperimentCondition | null) {
  return isSameActionsCondition(experimentCondition);
}
