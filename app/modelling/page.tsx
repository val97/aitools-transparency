"use client";

import { Suspense, type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Surface as HeroSurface, TextArea, Tooltip } from "@heroui/react";
import { GoGear } from "react-icons/go";
import {
  ActivityInstructionsButton,
  ActivityInstructionsOverlay,
  ModellingInstructionsContent,
} from "@/app/components";
import {
  blackBoxUsesSelectedFeatures,
  buildsHiddenGiniTree,
  conditionForStep,
  showsTrainingOutputs,
  revealsModelAfterPredicting,
  showsSelectedFeaturesWithBlackBox,
  showsTrainingDataTables,
  useExperimentCondition,
} from "@/app/lib/experimentCondition";
import { readDinoLabels } from "@/app/lib/dinoLabels";
import { dinoPictureSrc } from "@/app/lib/dinoPictures";
import {
  markCollectionStepStart,
  saveModelEnd,
  saveTrainedTree,
} from "@/app/lib/experimentCollection";
import { useSelectedFeatures } from "@/app/lib/featureSelectionState";
import WhiteBox from "./pageWB";
import {
  MODEL_CONFIG,
  type ModellingCondition,
} from "./modelConfig";
import {
  useResolvedModelInput,
  type ModelInput,
} from "./modelInputs";
import { collectionTreeFromWhiteBoxNodes, type FeatureGuess, ModelReveal, type ModelRevealStage } from "./ModelReveal";
import { countPredictions, fitBlackBoxModel, PredictionTrainingTableOverlay } from "./PredictionTrainingTableOverlay";
import { buildGreedyGiniTree, buildWhiteBoxPredictionRows } from "./whiteBoxTree";
import { TrainingTableOverlay } from "./TrainingTableOverlay";
import { markModelAsTrained, useModelTrainingResult, type ModelTrainingResult } from "./trainingState";
import { computeTrainingAccuracy, type PredictionTableRow, type TableCellValue } from "./tableRows";

type ModelCardProps = {
  isTrained: boolean;
  isDisabled?: boolean;
  isTraining?: boolean;
  onTrain: () => void;
};

type TableOverlayState = {
  kind: "training";
  dataFile: ModelInput["data"];
} | {
  kind: "predictions";
  modelInput?: ModelInput;
  rows?: PredictionTableRow[];
} | null;

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  variant?: "secondary" | "tertiary";
};

type ModellingTutorialStep =
  | "training-card"
  | "model-card"
  | "waiting-for-predictions"
  | "prediction-card"
  | "prediction-details"
  | null;

const TRAINING_CARD_HINT =
  "Le modèle regarde les données que tu as préparées. Il regardera le vrai régime alimentaire UNIQUEMENT comme correction, pour savoir s'il a bien classifié les dinosaures.";
// C4/C5: nobody prepared the data themselves.
const PREPARED_DATA_TRAINING_CARD_HINT =
  "Le modèle reçoit les données préparées par les archéologues: pour chaque dinosaure, ses caractéristiques et son régime alimentaire. En regardant ces exemples, il apprend à reconnaître les carnivores et les herbivores.";
const FEATURE_GUESS_PROMPT =
  "Tu ne peux pas voir à l'intérieur du modèle. Regarde ses prédictions dans le tableau: selon toi, quelles caractéristiques utilise-t-il pour décider ?";

const BLACK_BOX_REFLECTION_PROMPT =
  "Le modèle agit selon ses propres règles et tu ne peux pas voir exactement comment il différencie herbivores et carnivores, mais essayons de deviner ce qu'il a fait ! Inspecte ses prédictions: quelles pourraient être les caractéristiques qu'il a vraiment utilisées selon toi ? Explique ton raisonnement. Si tu trouves ça trop difficile, explique aussi pourquoi.";

// C5 tells the model phase as a story: guess what the model uses, see the
// real tree, then see why the algorithm picked its questions.
const MODEL_REVEAL_PAGES: Record<ModelRevealStage, { step: string; title: string; text: string }> = {
  rules: {
    step: "Étape 2/3",
    title: "Comment le modèle prédit vraiment",
    text: "Voici l'intérieur du modèle: un arbre de questions. Chaque dinosaure répond aux questions de haut en bas jusqu'en bas de l'arbre, où se trouve la prédiction. Suis les étapes 1, 2 et 3 à gauche.",
  },
  gini: {
    step: "Étape 3/3",
    title: "Pourquoi ces questions ?",
    text: "L'algorithme a construit l'arbre une question à la fois. À chaque fois, il a essayé toutes les caractéristiques et a gardé celle qui sépare le mieux les carnivores des herbivores. Suis les étapes à droite pour voir ses calculs.",
  },
};

function TutorialBackdrop({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      aria-label="Passer à l'étape suivante du tutoriel"
      className="fixed inset-0 z-[70] cursor-default bg-black/30"
      onClick={onDismiss}
    />
  );
}

function ModellingTutorialTarget({
  children,
  label,
  onDismiss,
  placement = "top",
  className = "",
}: {
  children: ReactNode;
  label: string;
  onDismiss: () => void;
  placement?: "top" | "right" | "bottom" | "left";
  className?: string;
}) {
  return (
    <Tooltip.Root isOpen>
      <div className={`relative ${className}`}>
        {children}
        <Tooltip.Trigger
          aria-label="Indication pour le tutoriel d'entraînement"
          className="pointer-events-none absolute inset-0 z-[80]"
        />
      </div>
      <TutorialBackdrop onDismiss={onDismiss} />
      <Tooltip.Content
        className="z-[90] w-[360px] max-w-[360px] break-normal rounded-[14px] border border-[#dedee0] bg-white px-[14px] py-[12px] text-[15px] font-semibold leading-[1.35] text-[#24324a] shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
        placement={placement}
        showArrow
        onClick={onDismiss}
      >
        <Tooltip.Arrow className="text-white [&_[data-slot=overlay-arrow]]:fill-white [&_[data-slot=overlay-arrow]]:stroke-[#dedee0]" />
        <p>{label}</p>
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function Surface({ children, className = "", variant = "secondary" }: SurfaceProps) {
  const surfaceColor = variant === "tertiary" ? "bg-[#eaeaea]" : "bg-[#efefef]/80";

  return (
    <HeroSurface
      variant={variant}
      className={`relative rounded-[24px] ${surfaceColor} shadow-[0_2px_4px_rgba(0,0,0,0.04),0_1px_2px_rgba(0,0,0,0.06),0_0_1px_rgba(0,0,0,0.06)] backdrop-blur-0 ${className}`}
    >
      {children}
    </HeroSurface>
  );
}

function TrainingDataCard({
  condition,
  displayFeatures,
  modelInput,
  onInspectTable,
  tutorialHint = TRAINING_CARD_HINT,
  tutorialStep = null,
  onTutorialDismiss = () => {},
}: {
  condition: ModellingCondition;
  displayFeatures?: string[];
  tutorialHint?: string;
  modelInput: ModelInput;
  onInspectTable?: () => void;
  tutorialStep?: ModellingTutorialStep;
  onTutorialDismiss?: () => void;
}) {
  const visibleFeatures = displayFeatures ?? (condition === "WB" ? modelInput.features : []);

  const card = (
    <section className="relative flex w-full flex-col gap-[10px] rounded-[24px] bg-white px-[24px] py-[20px] shadow-[0_2px_4px_rgba(0,0,0,0.06),0_-6px_6px_rgba(0,0,0,0.03),0_14px_14px_rgba(0,0,0,0.08)] backdrop-blur-[20px]">
      <p className="text-[16px] font-semibold leading-[1.5] text-black">
        Données d’entraînement:
      </p>

      {visibleFeatures.length > 0 && (
        <div className="flex flex-col gap-[10px]">
          <p className="text-[16px] leading-[1.5] text-black">Caractéristiques:</p>
          <div className="flex flex-wrap gap-[10px]">
            {visibleFeatures.map((feature) => (
              <span
                key={feature}
                className="inline-flex min-h-[32px] items-center justify-center rounded-full bg-[#ebebec] px-[8px] text-[13px] font-medium leading-[1.43] text-[#18181b]"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-[18px]">
        <div className="flex flex-col gap-[11px]">
          <p className="text-[16px] leading-[1.5] text-black">Données:</p>
          {onInspectTable && (
            <Button
              className="min-h-[32px] rounded-full border border-[#dedee0] bg-white px-[10px] text-[14px] font-medium leading-[20px] text-[#18181b]"
              onPress={onInspectTable}
            >
              Inspecter le tableau
            </Button>
          )}
        </div>

        <div className="flex w-[150px] flex-col gap-[8px]">
          <span className="flex min-h-[32px] items-center justify-center rounded-full bg-[#ff383c] px-[10px] text-[14px] font-medium leading-[20px] text-white">
            Carnivores: {modelInput.init_carnivores}
          </span>
          <span className="flex min-h-[32px] items-center justify-center rounded-full bg-[#17c964] px-[10px] text-[14px] font-medium leading-[20px] text-white">
            Herbivores: {modelInput.init_herbivores}
          </span>
        </div>
      </div>
    </section>
  );

  if (tutorialStep === "training-card") {
    return (
      <ModellingTutorialTarget
        label={tutorialHint}
        onDismiss={onTutorialDismiss}
        placement="bottom"
      >
        {card}
      </ModellingTutorialTarget>
    );
  }

  return card;
}

function BlackBoxedModel({ isTrained, isDisabled = false, isTraining = false, onTrain }: ModelCardProps) {
  const gearClassName = `absolute size-[20px] text-[#18181b] ${isTraining ? "animate-spin" : ""}`;

  return (
    <article className="relative flex h-[200px] w-[275px] flex-col items-center justify-center overflow-hidden rounded-[20px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_-6px_12px_rgba(0,0,0,0.03),0_14px_28px_rgba(0,0,0,0.08)] backdrop-blur-[20px]">
      <GoGear aria-hidden="true" className={`${gearClassName} left-[10px] top-[10px]`} />
      <GoGear aria-hidden="true" className={`${gearClassName} right-[10px] top-[10px]`} />
      <GoGear aria-hidden="true" className={`${gearClassName} bottom-[10px] left-[10px]`} />
      <GoGear aria-hidden="true" className={`${gearClassName} bottom-[10px] right-[10px]`} />
      <h2 className="mb-[14px] text-center text-[24px] font-bold leading-[1.34] text-black">
        {MODEL_CONFIG.title}
      </h2>
      <Button
        className={`min-h-[40px] rounded-full px-[16px] text-[14px] font-medium ${
          isTrained || isTraining
            ? "border border-[#dedee0] bg-white text-[#18181b]"
            : "bg-[#0485f7] text-white hover:bg-[#006fee]"
        }`}
        isDisabled={isDisabled}
        onPress={onTrain}
      >
        {isTraining ? "Entraînement..." : isTrained ? "Entraîné" : "Entraîner"}
      </Button>
      {isTraining && (
        <p className="mt-[10px] text-center text-[14px] font-medium leading-[1.43] text-[#71717a]">
          Entraînement en cours...
        </p>
      )}
    </article>
  );
}

function formatTrainingAccuracy(result: ModelTrainingResult) {
  const accuracyPercent = modelTrainingAccuracyPercent(result);

  if (accuracyPercent === null) {
    return null;
  }

  return `${Math.round(accuracyPercent)} %`;
}

function modelTrainingAccuracyPercent(result: ModelTrainingResult | null) {
  const predictionRows = result?.predictionRows;
  const accuracy = result?.trainingAccuracy ?? (
    predictionRows?.length ? computeTrainingAccuracy(predictionRows) : undefined
  );

  if (accuracy === undefined) {
    return null;
  }

  return Number((accuracy * 100).toFixed(1));
}

function ModelSummary({
  result,
  onInspectTable,
  tutorialStep = null,
  onTutorialDismiss = () => {},
}: {
  result: ModelTrainingResult;
  onInspectTable?: () => void;
  tutorialStep?: ModellingTutorialStep;
  onTutorialDismiss?: () => void;
}) {
  const trainingAccuracy = formatTrainingAccuracy(result);
  const inspectButton = onInspectTable ? (
    <Button
      className="min-h-[32px] rounded-full border border-[#dedee0] bg-white px-[10px] text-[14px] font-medium leading-[20px] text-[#18181b]"
      onPress={onInspectTable}
    >
      Inspecter le tableau
    </Button>
  ) : null;

  const card = (
    <div className="flex w-[220px] items-center">
      <Surface variant="tertiary" className="flex min-h-[111px] w-[220px] items-center justify-center px-[22px] py-[16px]">
        <div className="flex w-[177px] flex-col items-center justify-center gap-[8px]">
          <p className="text-[16px] font-semibold leading-[1.5] text-black">
            Prédictions:
          </p>
          <span className="flex h-[36px] min-h-[36px] w-full items-center justify-center rounded-[24px] bg-[#ff383c] px-[14px] py-[8px] text-[14px] font-medium leading-[20px] text-white">
            Carnivores: {result.pred_carnivores}
          </span>
          <span className="flex h-[36px] min-h-[36px] w-full items-center justify-center rounded-[24px] bg-[#17c964] px-[14px] py-[8px] text-[14px] font-medium leading-[20px] text-white">
            Herbivores: {result.pred_herbivores}
          </span>
          {trainingAccuracy && (
            <span className="flex min-h-[36px] w-full items-center justify-center rounded-[24px] bg-[#18181b] px-[14px] py-[8px] text-center text-[14px] font-medium leading-[20px] text-white">
              Précision: {trainingAccuracy}
            </span>
          )}
          {tutorialStep === "prediction-details" && inspectButton ? (
            <ModellingTutorialTarget
              label="Tu peux voir plus en détails ses prédictions ici."
              onDismiss={onTutorialDismiss}
              placement="bottom"
            >
              {inspectButton}
            </ModellingTutorialTarget>
          ) : (
            inspectButton
          )}
        </div>
      </Surface>
    </div>
  );

  if (tutorialStep === "prediction-card") {
    return (
      <ModellingTutorialTarget
        label="L'algorithme te fait un rapport de son entrainement: il te dit combien de carnivores et d'herbivores il a identifiés et à quel point il était précis dans ses prédictions."
        onDismiss={onTutorialDismiss}
        placement="bottom"
      >
        {card}
      </ModellingTutorialTarget>
    );
  }

  return card;
}

function formatCellValue(value: TableCellValue) {
  if (value === true || value === "True" || value === "true") {
    return "vrai";
  }

  if (value === false || value === "False" || value === "false") {
    return "faux";
  }

  return String(value ?? "");
}

function DietBadge({ diet }: { diet: string }) {
  return (
    <span
      className={`inline-flex min-h-[32px] items-center justify-center rounded-full px-[14px] text-[14px] font-medium text-white ${
        diet === "carnivore" ? "bg-[#ff383c]" : "bg-[#17c964]"
      }`}
    >
      {diet === "carnivore" ? "Carnivore" : "Herbivore"}
    </span>
  );
}

function formatFeatureGuess(guess: FeatureGuess) {
  return [
    FEATURE_GUESS_PROMPT,
    `Caractéristiques choisies: ${guess.features.join(", ")}`,
    `La plus importante: ${guess.mostImportant}`,
    `Pourquoi: ${guess.reason}`,
  ].join("\n");
}

// C4 and C5: instead of a free answer, students tick the features they think
// the closed model uses and pick the most important one.
function FeatureGuessForm({
  features,
  guess,
  isLocked,
  onChange,
}: {
  features: string[];
  guess: FeatureGuess;
  isLocked: boolean;
  onChange: (guess: FeatureGuess) => void;
}) {
  const toggleFeature = (feature: string) => {
    const nextFeatures = guess.features.includes(feature)
      ? guess.features.filter((current) => current !== feature)
      : features.filter((current) => current === feature || guess.features.includes(current));

    onChange({
      ...guess,
      features: nextFeatures,
      mostImportant: nextFeatures.includes(guess.mostImportant) ? guess.mostImportant : "",
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-[10px] rounded-[20px] bg-white px-[18px] py-[14px] text-[14px] text-[#18181b]">
      <p className="font-semibold">1. Coche les caractéristiques qu&apos;il utilise selon toi:</p>
      <div className="grid grid-cols-2 gap-[6px]">
        {features.map((feature) => (
          <label key={feature} className="flex min-h-[32px] cursor-pointer items-center gap-[8px] rounded-[10px] bg-[#f5f5f5] px-[10px]">
            <input
              type="checkbox"
              className="size-[16px] accent-[#006fee]"
              checked={guess.features.includes(feature)}
              disabled={isLocked}
              onChange={() => toggleFeature(feature)}
            />
            {feature}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-[10px]">
        <span className="font-semibold">2. La plus importante:</span>
        <select
          className="min-h-[32px] flex-1 rounded-[10px] border border-[#c9c9cf] bg-white px-[8px]"
          value={guess.mostImportant}
          disabled={isLocked || guess.features.length === 0}
          onChange={(event) => onChange({ ...guess, mostImportant: event.target.value })}
        >
          <option value="">Choisis…</option>
          {guess.features.map((feature) => (
            <option key={feature} value={feature}>{feature}</option>
          ))}
        </select>
      </label>
      <label className="flex min-h-0 flex-1 flex-col gap-[6px]">
        <span className="font-semibold">3. Explique pourquoi (facultatif):</span>
        <textarea
          className="min-h-[60px] flex-1 resize-none rounded-[10px] border border-[#c9c9cf] px-[10px] py-[6px] text-[14px]"
          placeholder="Ta réponse ici..."
          readOnly={isLocked}
          value={guess.reason}
          onChange={(event) => onChange({ ...guess, reason: event.target.value })}
        />
      </label>
    </div>
  );
}

// C4 and C5: the model stays closed; students see what it predicted for
// each training dinosaur and guess the rule behind it.
function TrainingOutputsTable({
  rows,
  features,
}: {
  rows: PredictionTableRow[];
  features: string[];
}) {
  return (
    <section
      className="flex min-w-0 flex-1 flex-col gap-[8px] rounded-[24px] bg-white px-[20px] py-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_-6px_12px_rgba(0,0,0,0.03),0_14px_28px_rgba(0,0,0,0.08)]"
      aria-label="Ce que le modèle a prédit"
    >
      <h2 className="text-[16px] font-semibold leading-[1.4] text-black">
        Voici ce que le modèle a prédit pour chaque dinosaure:
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px] text-[#18181b] [&_td_span]:min-h-[26px]">
          <thead>
            <tr className="border-b border-[#dedee0] text-[#52525b]">
              <th className="px-[8px] py-[4px] font-medium">nom</th>
              {features.map((feature) => (
                <th key={feature} className="px-[8px] py-[4px] font-medium">{feature}</th>
              ))}
              <th className="px-[8px] py-[4px] font-medium">prédiction du modèle</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={String(row.nom ?? index)} className="border-b border-[#f0f0f0]">
                <td className="px-[8px] py-[2px] font-medium">
                  <span className="flex items-center gap-[8px]">
                    {dinoPictureSrc(String(row.nom ?? "")) && (
                      <Image alt="" className="h-[26px] w-[44px] object-contain" height={26} src={dinoPictureSrc(String(row.nom ?? "")) ?? ""} width={44} />
                    )}
                    {String(row.nom ?? "")}
                  </span>
                </td>
                {features.map((feature) => (
                  <td key={feature} className="px-[8px] py-[2px]">{formatCellValue(row[feature])}</td>
                ))}
                <td className="px-[8px] py-[2px]">
                  <DietBadge diet={String(row.régime_alimentaire_prédit ?? "")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// C4 and C5: the greedy Gini tree, kept hidden behind the black-box card.
async function fitHiddenGiniTree(modelInput: ModelInput): Promise<ModelTrainingResult> {
  const nodes = await buildGreedyGiniTree({
    features: modelInput.features,
    labels: readDinoLabels(),
    dataFile: modelInput.data,
  });
  const predictionRows = await buildWhiteBoxPredictionRows(nodes, modelInput.data);

  return {
    ...countPredictions(predictionRows),
    trainingAccuracy: computeTrainingAccuracy(predictionRows),
    predictionRows,
    whiteBoxTree: nodes,
  };
}

function HorizontalSeparator({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-[5px] w-[72px] bg-[#dedee0] ${className}`}
    />
  );
}

function ModellingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const experimentCondition = useExperimentCondition();
  const resolvedCondition = conditionForStep(experimentCondition, "modelling");
  const condition: ModellingCondition = resolvedCondition ?? "WB";
  const isWhiteBoxTrainingRoute = condition === "WB" && searchParams.get("training") === "1";

  const trainingResult = useModelTrainingResult(condition);
  const isTrained = Boolean(trainingResult);
  const selectedFeatures = useSelectedFeatures();
  const [tableOverlay, setTableOverlay] = useState<TableOverlayState>(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true);
  const [blackBoxReflection, setBlackBoxReflection] = useState("");
  const [featureGuess, setFeatureGuess] = useState<FeatureGuess>({ features: [], mostImportant: "", reason: "" });
  const [isBlackBoxTraining, setIsBlackBoxTraining] = useState(false);
  const [blackBoxTrainingError, setBlackBoxTrainingError] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<ModellingTutorialStep>(null);
  const [hasStartedTutorial, setHasStartedTutorial] = useState(false);
  const [modelPage, setModelPage] = useState<"guess" | ModelRevealStage>("guess");
  const [hasOpenedModel, setHasOpenedModel] = useState(false);
  const [isOutputsPageOpen, setIsOutputsPageOpen] = useState(false);
  const showOutputs = showsTrainingOutputs(experimentCondition);
  const showTables = showsTrainingDataTables(experimentCondition);
  const revealsModel = revealsModelAfterPredicting(experimentCondition);

  useEffect(() => {
    markCollectionStepStart("Model");
  }, []);

  const modelInput = useResolvedModelInput({
    condition,
    selectedFeatures,
    useSelectedFeatures: blackBoxUsesSelectedFeatures(experimentCondition),
  });
  const trainingDataFeatures =
    condition === "WB"
      ? modelInput.features
      : showsSelectedFeaturesWithBlackBox(experimentCondition)
        ? selectedFeatures
        : [];
  useEffect(() => {
    if (tutorialStep === "waiting-for-predictions" && isTrained) {
      setTutorialStep("prediction-card");
    }
  }, [isTrained, tutorialStep]);

  if (isWhiteBoxTrainingRoute) {
    const isViewingTrainedTree = condition === "WB" && Boolean(trainingResult?.whiteBoxTree?.length);
    const showIntro = condition === "WB" && !isViewingTrainedTree && searchParams.get("intro") === "1";
    const openInstructions = () => setIsInstructionsOpen(true);
    const closeInstructions = () => setIsInstructionsOpen(false);

    return (
      <>
        <WhiteBox
          condition={condition}
          initialNodes={trainingResult?.whiteBoxTree}
          isReadOnly={Boolean(trainingResult?.whiteBoxTree?.length)}
          showIntro={showIntro}
          onShowInstructions={openInstructions}
        />
        {!isViewingTrainedTree && isInstructionsOpen && (
          <ActivityInstructionsOverlay
            title="Consignes"
            onClose={closeInstructions}
            stepImage={{
              alt: "Étape d'entraînement du modèle",
              height: 540,
              src: "/Hints/StepsTrain.png",
              width: 6700,
            }}
          >
            <ModellingInstructionsContent condition="WB" />
          </ActivityInstructionsOverlay>
        )}
      </>
    );
  }

  const openInstructions = () => {
    setTutorialStep(null);
    setHasStartedTutorial(false);
    setIsInstructionsOpen(true);
  };
  const closeInstructions = () => {
    setIsInstructionsOpen(false);

    if (!hasStartedTutorial) {
      setTutorialStep("training-card");
      setHasStartedTutorial(true);
    }
  };
  const hasPredictionDetails = Boolean(trainingResult?.predictionRows?.length || condition === "BB");
  const advanceTutorial = () => {
    setTutorialStep((currentStep) => {
      if (currentStep === "training-card") {
        return "model-card";
      }

      if (currentStep === "model-card") {
        return isTrained ? "prediction-card" : "waiting-for-predictions";
      }

      if (currentStep === "prediction-card") {
        return hasPredictionDetails ? "prediction-details" : null;
      }

      if (currentStep === "prediction-details") {
        return null;
      }

      return currentStep;
    });
  };

  const trainModel = async () => {
    if (condition === "WB") {
      router.push(`/modelling?training=1${!isTrained ? "&intro=1" : ""}`);
      return;
    }

    if (isTrained || isBlackBoxTraining) {
      return;
    }

    setIsBlackBoxTraining(true);
    setBlackBoxTrainingError(null);

    try {
      const result = buildsHiddenGiniTree(experimentCondition)
        ? await fitHiddenGiniTree(modelInput)
        : await fitBlackBoxModel(modelInput);

      markModelAsTrained(result, condition);
    } catch (error) {
      setBlackBoxTrainingError(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsBlackBoxTraining(false);
    }
  };
  const isBlackBoxReflectionComplete = showOutputs
    ? featureGuess.features.length > 0 && featureGuess.mostImportant !== ""
    : blackBoxReflection.trim().length > 0;
  const revealedTree = trainingResult?.whiteBoxTree;
  const canRevealModel = revealsModel && isBlackBoxReflectionComplete && Boolean(revealedTree?.length);
  const openModel = () => {
    if (revealedTree) {
      saveTrainedTree(collectionTreeFromWhiteBoxNodes(revealedTree));
    }

    setHasOpenedModel(true);
    setModelPage("rules");
  };
  const canGoToEvaluation =
    isTrained &&
    (condition !== "BB" || isBlackBoxReflectionComplete) &&
    (!revealsModel || modelPage === "gini");
  const goToEvaluation = () => {
    saveModelEnd(
      condition !== "BB"
        ? null
        : showOutputs
          ? formatFeatureGuess(featureGuess)
          : [BLACK_BOX_REFLECTION_PROMPT, blackBoxReflection].join("\n"),
      modelTrainingAccuracyPercent(trainingResult),
    );
    router.push("/evaluation");
  };

  if (!resolvedCondition) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-zinc-900">
        <p className="rounded-3xl bg-white p-8 text-lg shadow-lg">
          CONDITION ERROR: Retourner à la page d&apos;accueil pour définir la condition.
        </p>
      </div>
    );
  }

  const instructionsOverlay = isInstructionsOpen && (
    <ActivityInstructionsOverlay
      title="Consignes"
      onClose={closeInstructions}
      stepImage={{
        alt: "Étape d'entraînement du modèle",
        height: 540,
        src: "/Hints/StepsTrain.png",
        width: 6700,
      }}
    >
      <ModellingInstructionsContent condition={condition} />
    </ActivityInstructionsOverlay>
  );

  if (showOutputs && isOutputsPageOpen && modelPage === "guess" && trainingResult?.predictionRows) {
    return (
      <div
        className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-[40px] text-[#18181b]"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        <ActivityInstructionsButton onPress={openInstructions} />
        <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
        <Surface className="relative flex h-full w-full max-w-[1351px] flex-col gap-[16px] p-[32px]">
          <div className="w-full text-black">
            {revealsModel && <p className="text-[14px] font-medium text-[#52525b]">Étape 1/3</p>}
            <h1 className="text-[24px] font-bold leading-[1.34]">Devine comment le modèle décide</h1>
            <p className="mt-[6px] w-full text-[16px] leading-[1.5]">{FEATURE_GUESS_PROMPT}</p>
          </div>
          <div className="flex min-h-0 w-full flex-1 items-stretch gap-[20px]">
            <TrainingOutputsTable rows={trainingResult.predictionRows} features={modelInput.features} />
            <section className="flex w-[420px] shrink-0 flex-col gap-[12px]">
              <FeatureGuessForm
                features={modelInput.features}
                guess={featureGuess}
                isLocked={hasOpenedModel}
                onChange={setFeatureGuess}
              />
            </section>
          </div>
          <div className="flex justify-between">
            <Button
              className="min-h-[40px] rounded-[22px] border border-[#dedee0] bg-white px-[18px] text-[15px] font-medium text-[#18181b]"
              onPress={() => setIsOutputsPageOpen(false)}
            >
              Retour
            </Button>
            {revealsModel ? (
              <Button
                className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                isDisabled={!canRevealModel}
                onPress={openModel}
              >
                {hasOpenedModel ? "Revoir le modèle" : "Ouvrir le modèle"}
              </Button>
            ) : (
              <Button
                className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                isDisabled={!canGoToEvaluation}
                onPress={goToEvaluation}
              >
                Suite
              </Button>
            )}
          </div>
        </Surface>
        {instructionsOverlay}
      </div>
    );
  }

  if (modelPage !== "guess" && revealedTree && trainingResult?.predictionRows) {
    const pageText = MODEL_REVEAL_PAGES[modelPage];

    return (
      <div
        className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-[40px] text-[#18181b]"
        style={{ backgroundImage: "url('/background.png')" }}
      >
        <ActivityInstructionsButton onPress={openInstructions} />
        <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
        <Surface className="relative flex h-full w-full max-w-[1351px] flex-col gap-[16px] p-[32px]">
          <div className="w-full text-black">
            <p className="text-[14px] font-medium text-[#52525b]">{pageText.step}</p>
            <h1 className="text-[24px] font-bold leading-[1.34]">{pageText.title}</h1>
            <p className="mt-[6px] w-full text-[16px] leading-[1.5]">{pageText.text}</p>
          </div>
          <ModelReveal
            key={modelPage}
            nodes={revealedTree}
            rows={trainingResult.predictionRows}
            features={modelInput.features}
            stage={modelPage}
            studentGuess={featureGuess}
          />
          <div className="flex justify-between">
            <Button
              className="min-h-[40px] rounded-[22px] border border-[#dedee0] bg-white px-[18px] text-[15px] font-medium text-[#18181b]"
              onPress={() => setModelPage(modelPage === "gini" ? "rules" : "guess")}
            >
              Retour
            </Button>
            {modelPage === "rules" ? (
              <Button
                className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white"
                onPress={() => setModelPage("gini")}
              >
                Pourquoi ces questions ?
              </Button>
            ) : (
              <Button
                className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                isDisabled={!canGoToEvaluation}
                onPress={goToEvaluation}
              >
                Suite
              </Button>
            )}
          </div>
        </Surface>
        {instructionsOverlay}
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-[40px] text-[#18181b]"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      <ActivityInstructionsButton onPress={openInstructions} />
      <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
      <Surface
        className="relative flex min-h-[calc(100dvh-80px)] w-full max-w-[1351px] flex-col justify-center gap-[21px] p-[40px]"
      >
        <main className="relative flex w-full flex-col justify-center gap-[21px]">
          <div className="w-full text-black">
            <h1 className="text-[24px] font-bold leading-[1.34]">
              Entraîne ce modèle:
            </h1>
            <p className="mt-[9px] w-full text-[16px] leading-[1.5]">
              L&apos;algorithme regarde les données, et apprend à déterminer si un dinosaure est
              carnivore ou herbivore. Comment fait-il cela ? Clique sur &quot;Entraîner&quot; !
            </p>
          </div>

          <section className={`flex w-full items-center justify-center overflow-x-auto py-[18px]`} aria-label="Modèle à entraîner">
            <div className="flex min-w-max items-center justify-center">
              <div className="w-[545px] shrink-0">
                <TrainingDataCard
                  condition={condition}
                  displayFeatures={trainingDataFeatures}
                  modelInput={modelInput}
                  onInspectTable={
                    showTables ? () => setTableOverlay({ kind: "training", dataFile: modelInput.data }) : undefined
                  }
                  tutorialHint={showOutputs ? PREPARED_DATA_TRAINING_CARD_HINT : TRAINING_CARD_HINT}
                  tutorialStep={tutorialStep}
                  onTutorialDismiss={advanceTutorial}
                />
              </div>
              <HorizontalSeparator />
              <div className="shrink-0">
                {tutorialStep === "model-card" ? (
                  <ModellingTutorialTarget
                    label="Il doit ensuite apprendre à différencer les dinosaures. Pour cela lance l'entraînement du modèle !"
                    onDismiss={advanceTutorial}
                    placement="bottom"
                  >
                    <BlackBoxedModel
                      isDisabled={condition === "BB" && (isTrained || isBlackBoxTraining)}
                      isTrained={isTrained}
                      isTraining={isBlackBoxTraining}
                      onTrain={trainModel}
                    />
                  </ModellingTutorialTarget>
                ) : (
                  <BlackBoxedModel
                    isDisabled={condition === "BB" && (isTrained || isBlackBoxTraining)}
                    isTrained={isTrained}
                    isTraining={isBlackBoxTraining}
                    onTrain={trainModel}
                  />
                )}
              </div>
              {isTrained && trainingResult && (
                <>
                  <HorizontalSeparator />
                  <div className="shrink-0">
                    <ModelSummary
                      result={trainingResult}
                      onInspectTable={
                        !showTables || showOutputs
                          ? undefined
                          : trainingResult.predictionRows?.length
                          ? () => setTableOverlay({ kind: "predictions", modelInput, rows: trainingResult.predictionRows })
                          : condition === "BB"
                          ? () => setTableOverlay({ kind: "predictions", modelInput })
                          : undefined
                      }
                      tutorialStep={tutorialStep}
                      onTutorialDismiss={advanceTutorial}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {condition === "BB" && blackBoxTrainingError && (
            <p className="rounded-[12px] bg-white px-[18px] py-[12px] text-[14px] font-medium text-[#b42318]">
              {blackBoxTrainingError}
            </p>
          )}

          {condition === "BB" && isTrained && !showOutputs && (
            <section className="flex w-full flex-col gap-[12px]">
              <h2 className="text-[16px] font-medium leading-[1.43] text-[#18181b]">
                {BLACK_BOX_REFLECTION_PROMPT}
              </h2>
              <label className="flex min-h-[160px] min-w-0 flex-col gap-[6px]">
                <TextArea
                  className="h-full w-full flex-1 [&>div]:h-full [&>div]:w-full [&_textarea]:min-h-[128px] [&_textarea]:resize-none [&_textarea]:text-[14px]"
                  onChange={(event) => setBlackBoxReflection(event.target.value)}
                  placeholder="Ta réponse ici..."
                  value={blackBoxReflection}
                />
              </label>
            </section>
          )}

          <div className="flex justify-end">
            <Button
              className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
              isDisabled={showOutputs ? !isTrained : !canGoToEvaluation}
              onPress={showOutputs ? () => setIsOutputsPageOpen(true) : goToEvaluation}
            >
              Suite
            </Button>
          </div>
        </main>
      </Surface>
      {tableOverlay && (
        tableOverlay.kind === "training" ? (
          <TrainingTableOverlay
            dataFile={tableOverlay.dataFile}
            onClose={() => setTableOverlay(null)}
          />
        ) : (
          <PredictionTrainingTableOverlay
            modelInput={tableOverlay.modelInput}
            rows={tableOverlay.rows}
            onClose={() => setTableOverlay(null)}
          />
        )
      )}
      {instructionsOverlay}
    </div>
  );
}

export default function ModellingPage() {
  return (
    <Suspense fallback={null}>
      <ModellingPageContent />
    </Suspense>
  );
}
