"use client";

import { useEffect, useState } from "react";
import { ActivityInstructionsOverlay, FeatureSelectionInstructionsContent } from "@/app/components";
import { type FeatureSelectionTutorialStep } from "@/app/components/FeatureSelectionHints";
import { markCollectionStepStart } from "@/app/lib/experimentCollection";
import { conditionForStep, dataExposure, useExperimentCondition } from "@/app/lib/experimentCondition";
import BlackBox from "./pageBB";
import PreparedData from "./pagePrepared";
import WhiteBox from "./pageWB";

export default function FeatureSelectionInstructions() {
  const experimentCondition = useExperimentCondition();
  const condition = conditionForStep(experimentCondition, "feature_selection");
  const exposure = dataExposure(experimentCondition);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true);
  const [tutorialStep, setTutorialStep] = useState<FeatureSelectionTutorialStep>(null);
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

      if (currentStep === 2 && condition === "WB") {
        return 3;
      }

      return null;
    });
  };
  const visibleTutorialStep = isInstructionsOpen ? null : tutorialStep;

  useEffect(() => {
    markCollectionStepStart("FS");
  }, []);

  if (exposure) {
    return (
      <>
        <PreparedData exposure={exposure} onShowInstructions={openInstructions} />
        {isInstructionsOpen && (
          <ActivityInstructionsOverlay
            title="Consignes"
            onClose={() => setIsInstructionsOpen(false)}
            stepImage={{
              alt: "Étape de sélection des caractéristiques",
              height: 540,
              src: "/Hints/StepsFeat.png",
              width: 6700,
            }}
          >
            <p>
              {exposure === "exposed"
                ? "Avant d'entraîner l'algorithme, il faut préparer les données: donner le bon régime alimentaire à chaque dinosaure et choisir les caractéristiques à regarder. L'équipe d'archéologues l'a fait pour toi. Regarde ce qu'ils ont préparé."
                : "Les données sont prêtes pour l'algorithme."}
            </p>
          </ActivityInstructionsOverlay>
        )}
      </>
    );
  }

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
              alt: "Étape de sélection des caractéristiques",
              height: 540,
              src: "/Hints/StepsFeat.png",
              width: 6700,
            }}
          >
            <FeatureSelectionInstructionsContent condition="WB" />
          </ActivityInstructionsOverlay>
        )}
      </>
    );
  }

  if (condition === "BB") {
    return (
      <>
        <BlackBox
          onShowInstructions={openInstructions}
          tutorialStep={visibleTutorialStep}
          onTutorialDismiss={advanceTutorial}
        />
        {isInstructionsOpen && (
          <ActivityInstructionsOverlay
            title="Consignes"
            onClose={closeInstructions}
            stepImage={{
              alt: "Étape de sélection des caractéristiques",
              height: 540,
              src: "/Hints/StepsFeat.png",
              width: 6700,
            }}
          >
            <FeatureSelectionInstructionsContent condition="BB" />
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
