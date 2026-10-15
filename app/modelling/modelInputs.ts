"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MODEL_CONFIG,
  type ModelDataFile,
  type ModellingCondition,
} from "./modelConfig";
import { countDietRows, loadLabelledTrainingRows } from "./tableRows";

export type ModelInput = {
  features: string[];
  data: ModelDataFile;
  init_carnivores: number;
  init_herbivores: number;
};

const BLACK_BOX_FEATURES = [
  "longueur (m)",
  "poids (kg)",
  "espèce",
  "sous-ordre_taxonomique",
];

function fallbackFeatures() {
  return MODEL_CONFIG.features;
}

export function resolveModelInput({
  condition,
  selectedFeatures,
  useSelectedFeatures = false,
}: {
  condition: ModellingCondition;
  selectedFeatures: string[];
  useSelectedFeatures?: boolean;
}): ModelInput {
  if (condition === "BB" && !(useSelectedFeatures && selectedFeatures.length === 4)) {
    return {
      features: BLACK_BOX_FEATURES,
      data: MODEL_CONFIG.data,
      init_carnivores: MODEL_CONFIG.init_carnivores,
      init_herbivores: MODEL_CONFIG.init_herbivores,
    };
  }

  const fullFeatureSet = selectedFeatures.length === 4 ? selectedFeatures : fallbackFeatures();

  return {
    features: fullFeatureSet,
    data: MODEL_CONFIG.data,
    init_carnivores: MODEL_CONFIG.init_carnivores,
    init_herbivores: MODEL_CONFIG.init_herbivores,
  };
}

export function useResolvedModelInput({
  condition,
  selectedFeatures,
  useSelectedFeatures = false,
}: {
  condition: ModellingCondition;
  selectedFeatures: string[];
  useSelectedFeatures?: boolean;
}) {
  const selectedFeaturesKey = JSON.stringify(selectedFeatures);
  const features = useMemo(() => {
    const stableSelectedFeatures = JSON.parse(selectedFeaturesKey) as string[];

    return condition === "BB" && !(useSelectedFeatures && stableSelectedFeatures.length === 4)
      ? BLACK_BOX_FEATURES
      : stableSelectedFeatures.length === 4
        ? stableSelectedFeatures
        : fallbackFeatures();
  }, [condition, selectedFeaturesKey, useSelectedFeatures]);
  const [counts, setCounts] = useState({
    carnivores: MODEL_CONFIG.init_carnivores,
    herbivores: MODEL_CONFIG.init_herbivores,
  });
  const data = MODEL_CONFIG.data;

  useEffect(() => {
    let isActive = true;

    async function loadTrainingCounts() {
      try {
        const trainingTable = await loadLabelledTrainingRows(data);
        const nextCounts = countDietRows(trainingTable.rows);

        if (isActive) {
          setCounts(nextCounts);
        }
      } catch {
        if (isActive) {
          setCounts({
            carnivores: MODEL_CONFIG.init_carnivores,
            herbivores: MODEL_CONFIG.init_herbivores,
          });
        }
      }
    }

    loadTrainingCounts();

    return () => {
      isActive = false;
    };
  }, [data]);

  return useMemo(
    () => ({
      features,
      data,
      init_carnivores: counts.carnivores,
      init_herbivores: counts.herbivores,
    }),
    [counts.carnivores, counts.herbivores, data, features],
  );
}
