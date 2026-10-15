"use client";

import { useEffect, useState } from "react";
import BlackBox from "./pageBB";
import WhiteBox from "./pageWB";
import {
  ActivityInstructionsOverlay,
  DataLabellingInstructionsContent,
  type DataLabellingTutorialStep,
} from "@/app/components";
import { markCollectionStepStart } from "@/app/lib/experimentCollection";
import { conditionForStep, dataExposure, useExperimentCondition } from "@/app/lib/experimentCondition";

export default function DataLabellingInstructions() {
  const experimentCondition = useExperimentCondition();
  const condition = conditionForStep(experimentCondition, "data_labelling");
  const exposure = dataExposure(experimentCondition);
  const labellingMode = exposure === "exposed" ? "attributed" : exposure === "hidden" ? "hidden" : "stamped";
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true);
  const [tutorialStep, setTutorialStep] = useState<DataLabellingTutorialStep>(null);
  const [hasStartedTutorial, setHasStartedTutorial] = useState(false);
  const openInstructions = () => {
    setTutorialStep(null);
    setHasStartedTutorial(false);
    setIsInstructionsOpen(true);
  };
  const closeInstructions = () => {
    setIsInstructionsOpen(false);

    if (!hasStartedTutorial) {
      setTutorialStep(1);
      setHasStartedTutorial(true);
    }
  };
  const advanceTutorial = () => {
    setTutorialStep((currentStep) => {
      if (currentStep === 1) {
        return 2;
      }

      if (currentStep === 2) {
        return 3;
      }

      return null;
    });
  };
  const visibleTutorialStep = isInstructionsOpen ? null : tutorialStep;

  useEffect(() => {
    markCollectionStepStart("DL");
  }, []);

  if (condition === "WB") {
    return (
      <>
        <WhiteBox
          onShowInstructions={openInstructions}
          tutorialStep={visibleTutorialStep}
          onTutorialDismiss={advanceTutorial}
        />
        {isInstructionsOpen && (
          <ActivityInstructionsOverlay
            title="Consignes"
            onClose={closeInstructions}
            stepImage={{
              alt: "Étape d'étiquetage des données",
              height: 540,
              src: "/Hints/StepsEtiqu.png",
              width: 6740,
            }}
          >
            <DataLabellingInstructionsContent condition="WB" />
          </ActivityInstructionsOverlay>
        )}
      </>
    );
  }

  if (condition === "BB") {
    return (
      <>
        <BlackBox
          mode={labellingMode}
          onShowInstructions={openInstructions}
          tutorialStep={visibleTutorialStep}
          onTutorialDismiss={advanceTutorial}
        />
        {isInstructionsOpen && (
          <ActivityInstructionsOverlay
            title="Consignes"
            onClose={closeInstructions}
            stepImage={{
              alt: "Étape d'étiquetage des données",
              height: 540,
              src: "/Hints/StepsEtiqu.png",
              width: 6740,
            }}
          >
            <DataLabellingInstructionsContent condition="BB" />
          </ActivityInstructionsOverlay>
        )}
      </>
    );
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-zinc-900">
      <p className="rounded-3xl bg-white p-8 text-lg shadow-lg">
        Choisis d&apos;abord une condition sur la page d&apos;accueil.
      </p>
    </div>
  );
}
