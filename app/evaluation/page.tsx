"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Button, Surface as HeroSurface, Input, TextArea, Tooltip } from "@heroui/react";
import { useRouter } from "next/navigation";
import { GoGear } from "react-icons/go";
import {
  ActivityInstructionsButton,
  ActivityInstructionsOverlay,
  DataTable,
  EvaluationInstructionsContent,
  type SortConfig,
} from "@/app/components";
import { readDinoLabels } from "@/app/lib/dinoLabels";
import { saveEvaluationResponses } from "@/app/lib/evaluationResponses";
import {
  markCollectionStepStart,
  saveEvaluationEnd,
  submitExperimentCollection,
} from "@/app/lib/experimentCollection";
import {
  blackBoxUsesSelectedFeatures,
  conditionForStep,
  evaluatesCardByCard,
  revealsModelAfterPredicting,
  showsSelectedFeaturesWithBlackBox,
  useExperimentCondition,
} from "@/app/lib/experimentCondition";
import { readSelectedFeatures } from "@/app/lib/featureSelectionState";
import {
  type ModellingCondition,
} from "@/app/modelling/modelConfig";
import {
  resolveModelInput,
  type ModelInput,
} from "@/app/modelling/modelInputs";
import { readModelTrainingResult } from "@/app/modelling/trainingState";
import { buildWhiteBoxPredictionRows } from "@/app/modelling/whiteBoxTree";
import { TestCardWalkthrough, TestResultsTable } from "./TestCardWalkthrough";

type AccuracyField = "correct" | "wrong" | "total" | "accuracy";
type AccuracyInputs = Record<AccuracyField, string>;
type TestTableRow = Record<string, string | number | boolean | undefined>;
type TableOverlayState = {
  modelInput: ModelInput;
  rows?: TestTableRow[];
} | null;
type ExpectedModelAnswers = {
  accuracy: Record<AccuracyField, number>;
};
type EvaluationTutorialStep =
  | "test-data"
  | "model-card"
  | "waiting-for-prediction"
  | "prediction-card"
  | "scaffold-counts"
  | "accuracy-formula"
  | null;

const BACKGROUND_IMAGE = "/background.png";
const LABEL_COLUMN = "régime_alimentaire";
const PREDICTION_COLUMN = "régime_alimentaire_prédit";

const QUESTION_PROMPTS = [
  "Es-tu satisfait(e) de la performance du modèle ? Pourquoi ?",
  "Repense à ce qu'il s'est passé pendant les étapes précédentes. Que changerais-tu pour améliorer la performance du modèle ?",
];
const MODEL_TITLE = "Modèle";

function modelTableColumns(features: string[]) {
  return ["nom", LABEL_COLUMN, PREDICTION_COLUMN, ...features];
}

function compareCellValues(firstValue: string | number | boolean | undefined, secondValue: string | number | boolean | undefined) {
  const firstText = String(firstValue ?? "");
  const secondText = String(secondValue ?? "");
  const firstNumber = Number(firstText);
  const secondNumber = Number(secondText);
  const canCompareAsNumbers = firstText.trim() !== "" && secondText.trim() !== "" && !Number.isNaN(firstNumber) && !Number.isNaN(secondNumber);

  if (canCompareAsNumbers) {
    return firstNumber - secondNumber;
  }

  return firstText.localeCompare(secondText, "fr", {
    numeric: true,
    sensitivity: "base",
  });
}

function emptyAccuracyInputs() {
  return { correct: "", wrong: "", total: "", accuracy: "" };
}

function emptyReflectionAnswers() {
  return QUESTION_PROMPTS.map(() => "");
}

function isCountCorrect(value: string, expectedValue: number) {
  return value.trim() !== "" && Number(value) === expectedValue;
}

function isAccuracyCorrect(value: string, expectedValue: number) {
  if (value.trim() === "") {
    return false;
  }

  return Math.abs(Number(value) - expectedValue) <= 0.1;
}

function computeExpectedAnswers(rows: TestTableRow[]): ExpectedModelAnswers {
  const correct = rows.filter((row) => row[LABEL_COLUMN] === row[PREDICTION_COLUMN]).length;
  const total = rows.length;
  const wrong = Math.max(total - correct, 0);
  const accuracy = total > 0 ? Number(((correct / total) * 100).toFixed(1)) : 0;

  return {
    accuracy: { correct, wrong, total, accuracy },
  };
}

function accuracyFractionToPercent(accuracy: number | undefined) {
  return accuracy === undefined ? null : Number((accuracy * 100).toFixed(1));
}

async function fetchBlackBoxPredictionRows(modelInput: ModelInput) {
  const response = await fetch("/api/evaluation/predictions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      features: modelInput.features,
      labels: readDinoLabels(),
      dataFile: modelInput.data,
    }),
  });

  if (!response.ok) {
    throw new Error("Impossible de calculer les prédictions du modèle.");
  }

  const payload = (await response.json()) as { rows?: TestTableRow[] };
  return payload.rows ?? [];
}

function Surface({
  children,
  className = "",
  variant = "secondary",
}: {
  children: ReactNode;
  className?: string;
  variant?: "secondary" | "tertiary";
}) {
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

function EvaluationTutorialTarget({
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
          aria-label="Indication pour le tutoriel d'évaluation"
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

function TestDataCard({
  displayFeatures,
  tutorialStep = null,
  onTutorialDismiss = () => {},
}: {
  displayFeatures: string[];
  tutorialStep?: EvaluationTutorialStep;
  onTutorialDismiss?: () => void;
}) {
  const card = (
    <section className="relative flex w-full flex-col gap-[10px] rounded-[24px] bg-white px-[24px] py-[20px] shadow-[0_2px_4px_rgba(0,0,0,0.06),0_-6px_6px_rgba(0,0,0,0.03),0_14px_14px_rgba(0,0,0,0.08)] backdrop-blur-[20px]">
      <p className="text-[16px] font-semibold leading-[1.5] text-black">
        Données de test:
      </p>
      {displayFeatures.length > 0 && (
        <div className="flex flex-col gap-[10px]">
          <p className="text-[16px] leading-[1.5] text-black">Caractéristiques:</p>
          <div className="flex flex-wrap gap-[10px]">
            {displayFeatures.map((feature) => (
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
      <p className="text-[16px] leading-[1.5] text-black">
        Nouveaux dinosaures à classifier.
      </p>
    </section>
  );

  if (tutorialStep === "test-data") {
    return (
      <EvaluationTutorialTarget
        label="Donne de NOUVELLES données à l’algorithme pour voir comment il performe sur des données qu’il n’a jamais vues"
        onDismiss={onTutorialDismiss}
        placement="bottom"
      >
        {card}
      </EvaluationTutorialTarget>
    );
  }

  return card;
}

function EvaluationModelCard({
  hasPredicted,
  isPredicting,
  onPredict,
  tutorialStep = null,
  onTutorialDismiss = () => {},
}: {
  hasPredicted: boolean;
  isPredicting: boolean;
  onPredict: () => void;
  tutorialStep?: EvaluationTutorialStep;
  onTutorialDismiss?: () => void;
}) {
  const gearClassName = `absolute size-[20px] text-[#18181b] ${isPredicting ? "animate-spin" : ""}`;

  const card = (
    <article className="relative flex h-[200px] w-[275px] flex-col items-center justify-center overflow-hidden rounded-[20px] bg-white px-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_-6px_12px_rgba(0,0,0,0.03),0_14px_28px_rgba(0,0,0,0.08)] backdrop-blur-[20px]">
      <GoGear aria-hidden="true" className={`${gearClassName} left-[10px] top-[10px]`} />
      <GoGear aria-hidden="true" className={`${gearClassName} right-[10px] top-[10px]`} />
      <GoGear aria-hidden="true" className={`${gearClassName} bottom-[10px] left-[10px]`} />
      <GoGear aria-hidden="true" className={`${gearClassName} bottom-[10px] right-[10px]`} />
      <h2 className="mb-[14px] text-center text-[24px] font-bold leading-[1.34] text-black">
        {MODEL_TITLE}
      </h2>
      <Button
        className={`h-auto min-h-[48px] max-w-[220px] whitespace-normal rounded-full px-[16px] text-center text-[14px] font-medium leading-[1.2] ${
          hasPredicted || isPredicting
            ? "border border-[#dedee0] bg-white text-[#18181b]"
            : "bg-[#0485f7] text-white hover:bg-[#006fee]"
        }`}
        isDisabled={hasPredicted || isPredicting}
        onPress={onPredict}
      >
        {isPredicting
          ? "Prédiction..."
          : hasPredicted
            ? "Prédiction terminée"
            : "Prédire le régime des nouveaux dinosaures"}
      </Button>
      {isPredicting && (
        <p className="mt-[10px] text-center text-[14px] font-medium leading-[1.43] text-[#71717a]">
          Prédiction en cours...
        </p>
      )}
    </article>
  );

  if (tutorialStep === "model-card") {
    return (
      <EvaluationTutorialTarget
        label="Lance la prédiction: le modèle applique ce qu’il a appris sur les nouveaux dinosaures"
        onDismiss={onTutorialDismiss}
        placement="bottom"
      >
        {card}
      </EvaluationTutorialTarget>
    );
  }

  return card;
}

function answerKey(section: "accuracy", field: AccuracyField) {
  return `${section}:${field}`;
}

function HorizontalSeparator({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-[5px] w-[72px] bg-[#dedee0] ${className}`}
    />
  );
}

function PredictionSummary({
  onInspectTable,
  rows,
  tutorialStep = null,
  onTutorialDismiss = () => {},
}: {
  onInspectTable: () => void;
  rows: TestTableRow[];
  tutorialStep?: EvaluationTutorialStep;
  onTutorialDismiss?: () => void;
}) {
  const predCarnivores = rows.filter((row) => row[PREDICTION_COLUMN] === "carnivore").length;
  const predHerbivores = rows.filter((row) => row[PREDICTION_COLUMN] === "herbivore").length;

  const card = (
    <div className="flex w-[220px] items-center">
      <Surface variant="tertiary" className="flex min-h-[111px] w-[220px] items-center justify-center px-[22px] py-[16px]">
        <div className="flex w-[177px] flex-col items-center justify-center gap-[8px]">
          <p className="text-[16px] font-semibold leading-[1.5] text-black">
            Prédictions:
          </p>
          <span className="flex h-[36px] min-h-[36px] w-full items-center justify-center rounded-[24px] bg-[#ff383c] px-[14px] py-[8px] text-[14px] font-medium leading-[20px] text-white">
            Carnivores: {predCarnivores}
          </span>
          <span className="flex h-[36px] min-h-[36px] w-full items-center justify-center rounded-[24px] bg-[#17c964] px-[14px] py-[8px] text-[14px] font-medium leading-[20px] text-white">
            Herbivores: {predHerbivores}
          </span>
          <Button
            className="min-h-[32px] rounded-full border border-[#dedee0] bg-white px-[10px] text-[14px] font-medium leading-[20px] text-[#18181b]"
            onPress={onInspectTable}
          >
            Inspecter le tableau
          </Button>
        </div>
      </Surface>
    </div>
  );

  if (tutorialStep === "prediction-card") {
    return (
      <EvaluationTutorialTarget
        label="Inspecte le rapport du modèle: a-t-il bien prédit leur régimes ?"
        onDismiss={onTutorialDismiss}
        placement="bottom"
      >
        {card}
      </EvaluationTutorialTarget>
    );
  }

  return card;
}

function CountInput({
  ariaLabel,
  isInvalid = false,
  label,
  onChange,
  value,
}: {
  ariaLabel: string;
  isInvalid?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="flex min-h-[116px] min-w-0 flex-col justify-between gap-[10px] rounded-[16px] bg-white px-[16px] py-[14px] shadow-[0_2px_4px_rgba(0,0,0,0.06),0_-4px_6px_rgba(0,0,0,0.02),0_10px_14px_rgba(0,0,0,0.06)]">
      <span className="text-[13px] font leading-[1.35] text-[#18181b]">
        {label}
      </span>
      <Input
        aria-label={ariaLabel}
        className={`h-[40px] rounded-[12px] border bg-white px-[10px] text-[15px] outline-none transition focus:border-[#006fee] ${
          isInvalid ? "border-[#ff383c] bg-[#fff1f1] ring-2 ring-inset ring-[#ff383c]" : "border-[#c9c9cf]"
        }`}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Nombre..."
        type="number"
        value={value}
      />
    </label>
  );
}

function AccuracyScaffold({
  accuracy,
  correct,
  invalidFields,
  onChange,
  tutorialStep = null,
  onTutorialDismiss = () => {},
  total,
  wrong,
}: {
  accuracy: string;
  correct: string;
  invalidFields: Set<string>;
  onChange: (field: AccuracyField, value: string) => void;
  tutorialStep?: EvaluationTutorialStep;
  onTutorialDismiss?: () => void;
  total: string;
  wrong: string;
}) {
  const countInputs = (
    <>
      <CountInput
        ariaLabel="Nombre de prédictions correctes"
        isInvalid={invalidFields.has(answerKey("accuracy", "correct"))}
        label="Compte le nombre de prédictions correctes ✅"
        onChange={(value) => onChange("correct", value)}
        value={correct}
      />
      <CountInput
        ariaLabel="Nombre de mauvaises prédictions"
        isInvalid={invalidFields.has(answerKey("accuracy", "wrong"))}
        label="Compte le nombre de mauvaises prédictions ❌"
        onChange={(value) => onChange("wrong", value)}
        value={wrong}
      />
      <CountInput
        ariaLabel="Nombre total de dinosaures 🦕🦖"
        isInvalid={invalidFields.has(answerKey("accuracy", "total"))}
        label="Compte le nombre total de dinosaures"
        onChange={(value) => onChange("total", value)}
        value={total}
      />
    </>
  );
  const formula = (
    <div className="flex min-h-[116px] min-w-0 items-center justify-center rounded-[16px] bg-white px-[18px] py-[14px] shadow-[0_2px_4px_rgba(0,0,0,0.06),0_-4px_6px_rgba(0,0,0,0.02),0_10px_14px_rgba(0,0,0,0.06)]">
      <div className="flex flex-wrap items-center justify-center gap-[10px] text-[20px] font-semibold leading-[1.3] text-[#18181b]">
        <span className="font-serif">Précision =</span>
        <span className="inline-flex flex-col items-center font-serif text-[16px] leading-[1.15]">
          <span>prédictions correctes</span>
          <span className="mt-[3px] w-full border-t border-[#18181b] pt-[3px] text-center">
            total dinosaures
          </span>
        </span>
        <span className="font-serif">× 100 =</span>
        <Input
          aria-label="Précision calculée en pourcentage"
          className={`h-[40px] w-[112px] rounded-[12px] border bg-white px-[10px] text-[15px] outline-none transition focus:border-[#006fee] ${
            invalidFields.has(answerKey("accuracy", "accuracy"))
              ? "border-[#ff383c] bg-[#fff1f1] ring-2 ring-inset ring-[#ff383c]"
              : "border-[#c9c9cf]"
          }`}
          onChange={(event) => onChange("accuracy", event.target.value)}
          placeholder="Précision"
          type="number"
          value={accuracy}
        />
        <span className="font-serif">%</span>
      </div>
    </div>
  );

  return (
    <section className="flex flex-col gap-[18px]" aria-label="Calcul de la précision">
      <div className="grid w-full grid-cols-1 items-stretch gap-[14px] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
        {tutorialStep === "scaffold-counts" ? (
          <EvaluationTutorialTarget
            className="grid grid-cols-1 gap-[14px] md:col-span-3 md:grid-cols-3"
            label="Compte les détails des prédictions et reporte les ici. "
            onDismiss={onTutorialDismiss}
            placement="top"
          >
            {countInputs}
          </EvaluationTutorialTarget>
        ) : (
          countInputs
        )}
        {tutorialStep === "accuracy-formula" ? (
          <EvaluationTutorialTarget
            className="min-w-0"
            label="En utilisant tes résultats intermédiaires, calcule la précision du modèle en t’aidant de la formule."
            onDismiss={onTutorialDismiss}
            placement="top"
          >
            {formula}
          </EvaluationTutorialTarget>
        ) : (
          formula
        )}
      </div>
    </section>
  );
}

function ReflectionPrompt({
  onChange,
  prompt,
  value,
}: {
  onChange: (value: string) => void;
  prompt: string;
  value: string;
}) {
  return (
    <label className="flex min-h-[225px] min-w-[116px] flex-col gap-[4px]">
      <span className="pr-[8px] text-[14px] font-medium leading-[1.43] text-[#18181b]">
        {prompt}
      </span>
      <TextArea
        className="h-full w-full flex-1 [&>div]:h-full [&>div]:w-full [&_textarea]:min-h-[174px] [&_textarea]:resize-none [&_textarea]:text-[14px]"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ta réponse ici..."
        value={value}
      />
    </label>
  );
}

function TestTableOverlay({
  displayFeatures,
  modelInput,
  onClose,
  rows: providedRows,
}: {
  displayFeatures: string[];
  modelInput: ModelInput;
  onClose: () => void;
  rows?: TestTableRow[];
}) {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<TestTableRow[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadTestTable() {
      try {
        const nextRows = providedRows ?? (await fetchBlackBoxPredictionRows(modelInput));
        const nextHeaders = modelTableColumns(displayFeatures);

        if (isActive) {
          setHeaders(nextHeaders);
          setRows(nextRows);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
        }
      }
    }

    loadTestTable();

    return () => {
      isActive = false;
    };
  }, [displayFeatures, modelInput, providedRows]);

  const sortedRows = useMemo(() => {
    if (!sortConfig) {
      return rows;
    }

    return [...rows].sort((firstRow, secondRow) => {
      const comparison = compareCellValues(firstRow[sortConfig.column], secondRow[sortConfig.column]);

      return sortConfig.direction === "ascending" ? comparison : -comparison;
    });
  }, [rows, sortConfig]);

  const updateSort = (column: string) => {
    setSortConfig((currentSort) => {
      if (currentSort?.column !== column) {
        return { column, direction: "ascending" };
      }

      return {
        column,
        direction: currentSort.direction === "ascending" ? "descending" : "ascending",
      };
    });
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/45 px-[32px] py-[32px] backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-table-title"
        className="flex max-h-full w-full max-w-[1280px] flex-col gap-[18px] overflow-hidden rounded-[24px] border border-[#dedee0] bg-[#f5f5f5] p-[32px] text-[#18181b] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_14px_28px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-start justify-between gap-[18px]">
          <div>
            <h2 id="test-table-title" className="text-[28px] font-bold leading-[1.16]">
              Données de test - {MODEL_TITLE}
            </h2>
            <p className="mt-[6px] text-[14px] font-medium text-[#52525b]">
              {sortConfig
                ? `Tri: ${sortConfig.column} (${sortConfig.direction === "ascending" ? "croissant" : "décroissant"})`
                : "Tri: tableau initial"}
            </p>
          </div>
          <div className="flex items-center gap-[10px]">
            <Button
              className="rounded-full border border-[#c9c9cf] bg-white px-[14px] py-[8px] text-[14px] font-medium text-[#27272a] transition hover:border-[#71717a] disabled:cursor-not-allowed disabled:opacity-45"
              isDisabled={!sortConfig}
              onPress={() => setSortConfig(null)}
            >
              Réinitialiser le tri
            </Button>
            <Button
              className="min-h-[40px] rounded-full bg-[#18181b] px-[16px] text-[14px] font-medium text-white"
              onPress={onClose}
            >
              Fermer
            </Button>
          </div>
        </div>

        <div className="min-h-0 overflow-auto rounded-[8px] border border-[#dedee0] bg-white">
          {errorMessage ? (
            <p className="p-[20px] text-[16px] text-[#b42318]">{errorMessage}</p>
          ) : (
            <DataTable
              headers={headers}
              rows={sortedRows}
              sortConfig={sortConfig}
              onSort={updateSort}
              getRowKey={(row) => String(row.nom)}
            />
          )}
        </div>
      </section>
    </div>
  );
}

export default function EvaluationPage() {
  const router = useRouter();
  const experimentCondition = useExperimentCondition();
  const resolvedCondition = conditionForStep(experimentCondition, "evaluation");
  const condition: ModellingCondition = resolvedCondition ?? "WB";
  const selectedFeatures = useMemo(() => readSelectedFeatures(), []);
  const [tableOverlay, setTableOverlay] = useState<TableOverlayState>(null);
  const [accuracyInputs, setAccuracyInputs] = useState<AccuracyInputs>(() => emptyAccuracyInputs());
  const [reflectionAnswers, setReflectionAnswers] = useState<string[]>(() => emptyReflectionAnswers());
  const [accuracyAttempts, setAccuracyAttempts] = useState(0);
  const [invalidFields, setInvalidFields] = useState<Set<string>>(new Set());
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
  const [allCalculationsAreCorrect, setAllCalculationsAreCorrect] = useState(false);
  const [saveErrorMessage, setSaveErrorMessage] = useState<string | null>(null);
  const [isCheckingAnswers, setIsCheckingAnswers] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(true);
  const [predictionRows, setPredictionRows] = useState<TestTableRow[] | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionErrorMessage, setPredictionErrorMessage] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<EvaluationTutorialStep>(null);
  const [hasStartedTutorial, setHasStartedTutorial] = useState(false);
  const [cardPage, setCardPage] = useState<"cards" | "accuracy" | "reflection" | null>(null);
  const isCardEvaluation = evaluatesCardByCard(experimentCondition);

  const modelInput = resolveModelInput({
    condition,
    selectedFeatures,
    useSelectedFeatures: blackBoxUsesSelectedFeatures(experimentCondition),
  });
  const trainingResult = useMemo(() => readModelTrainingResult(condition), [condition]);
  const evaluationDataFeatures = useMemo(() => {
    if (condition === "WB") {
      return modelInput.features;
    }

    if (showsSelectedFeaturesWithBlackBox(experimentCondition)) {
      return selectedFeatures;
    }

    return [];
  }, [condition, experimentCondition, modelInput.features, selectedFeatures]);
  const modelInputKey = JSON.stringify({
    condition,
    features: modelInput.features,
    data: modelInput.data,
    whiteBoxTree: condition === "WB" ? trainingResult?.whiteBoxTree : undefined,
  });

  useEffect(() => {
    markCollectionStepStart("Eval");
  }, []);

  useEffect(() => {
    setAllCalculationsAreCorrect(false);
    setAccuracyInputs(emptyAccuracyInputs());
    setInvalidFields(new Set());
    setVerificationMessage(null);
    setPredictionRows(null);
    setPredictionErrorMessage(null);
  }, [modelInputKey]);

  useEffect(() => {
    if (tutorialStep === "waiting-for-prediction" && predictionRows) {
      setTutorialStep("prediction-card");
    }
  }, [predictionRows, tutorialStep]);

  const openInstructions = () => {
    setTutorialStep(null);
    setHasStartedTutorial(false);
    setIsInstructionsOpen(true);
  };

  const closeInstructions = () => {
    setIsInstructionsOpen(false);

    if (!hasStartedTutorial) {
      setTutorialStep("test-data");
      setHasStartedTutorial(true);
    }
  };

  const advanceTutorial = () => {
    setTutorialStep((currentStep) => {
      if (currentStep === "test-data") {
        return "model-card";
      }

      if (currentStep === "model-card") {
        return predictionRows ? "prediction-card" : "waiting-for-prediction";
      }

      if (currentStep === "prediction-card") {
        return "scaffold-counts";
      }

      if (currentStep === "scaffold-counts") {
        return "accuracy-formula";
      }

      if (currentStep === "accuracy-formula") {
        return null;
      }

      return currentStep;
    });
  };

  const clearInvalidField = (fieldKey: string) => {
    setInvalidFields((currentInvalidFields) => {
      if (!currentInvalidFields.has(fieldKey)) {
        return currentInvalidFields;
      }

      const nextInvalidFields = new Set(currentInvalidFields);
      nextInvalidFields.delete(fieldKey);
      return nextInvalidFields;
    });
  };

  const updateAccuracyInput = (field: AccuracyField, value: string) => {
    setAllCalculationsAreCorrect(false);
    setVerificationMessage(null);
    setSaveErrorMessage(null);
    clearInvalidField(answerKey("accuracy", field));
    setAccuracyInputs((currentInputs) => ({
      ...currentInputs,
      [field]: value,
    }));
  };
  const updateReflectionAnswer = (index: number, value: string) => {
    setSaveErrorMessage(null);
    setReflectionAnswers((currentAnswers) =>
      currentAnswers.map((currentAnswer, currentIndex) => (currentIndex === index ? value : currentAnswer)),
    );
  };
  const areReflectionAnswersComplete = reflectionAnswers.every((answer) => answer.trim() !== "");
  const canFinishEvaluation = allCalculationsAreCorrect && areReflectionAnswersComplete;
  const hasPredicted = predictionRows !== null;
  const predictModel = async () => {
    if (hasPredicted || isPredicting) {
      return;
    }

    setIsPredicting(true);
    setPredictionErrorMessage(null);
    setVerificationMessage(null);
    setSaveErrorMessage(null);

    try {
      // A stored tree is used whenever there is one: always in C1, and for
      // the C4/C5 tree. Other black-box conditions use the backend model.
      const rows = trainingResult?.whiteBoxTree?.length
        ? await buildWhiteBoxPredictionRows(trainingResult.whiteBoxTree, "df_test.csv")
        : condition === "WB"
          ? null
          : await fetchBlackBoxPredictionRows(modelInput);

      if (!rows) {
        throw new Error("Aucun arbre entraîné n'est disponible pour ce modèle.");
      }

      setPredictionRows(rows);

      if (isCardEvaluation) {
        setTutorialStep(null);
        setCardPage("cards");
      }
    } catch (error) {
      setPredictionRows(null);
      setPredictionErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsPredicting(false);
    }
  };
  const verifyAnswers = async () => {
    if (!predictionRows) {
      setVerificationMessage("Lance d'abord la prédiction du modèle.");
      return;
    }

    setAccuracyAttempts((currentAttempts) => currentAttempts + 1);
    setIsCheckingAnswers(true);
    setVerificationMessage(null);
    setSaveErrorMessage(null);

    try {
      const expected = computeExpectedAnswers(predictionRows);
      const nextInvalidFields = new Set<string>();

      (["correct", "wrong", "total"] as const).forEach((field) => {
        if (!isCountCorrect(accuracyInputs[field], expected.accuracy[field])) {
          nextInvalidFields.add(answerKey("accuracy", field));
        }
      });

      if (!isAccuracyCorrect(accuracyInputs.accuracy, expected.accuracy.accuracy)) {
        nextInvalidFields.add(answerKey("accuracy", "accuracy"));
      }

      setInvalidFields(nextInvalidFields);
      setAllCalculationsAreCorrect(nextInvalidFields.size === 0);
      setVerificationMessage(
        nextInvalidFields.size === 0
          ? "Tout est correct."
          : "Certaines réponses semblent incorrectes. Les cases concernées sont indiquées en rouge.",
      );
    } catch (error) {
      setAllCalculationsAreCorrect(false);
      setVerificationMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setIsCheckingAnswers(false);
    }
  };
  const saveAndFinish = async () => {
    if (!predictionRows) {
      setSaveErrorMessage("Lance d'abord la prédiction du modèle.");
      return;
    }

    try {
      const expected = computeExpectedAnswers(predictionRows);
      const trainingResult = readModelTrainingResult(condition);

      saveEvaluationEnd({
        accuracyAttempts,
        modelTrainingAccuracyPercent: accuracyFractionToPercent(trainingResult?.trainingAccuracy),
        modelTestingAccuracyPercent: expected.accuracy.accuracy,
        perfSatisfactionAnswer: reflectionAnswers[0] ?? "",
        improvementsAnswer: reflectionAnswers[1] ?? "",
      });
      await submitExperimentCollection();
      saveEvaluationResponses({
        savedAt: new Date().toISOString(),
        condition,
        selectedFeatures,
        accuracyInputs,
        matrixInputs: {},
        reflectionAnswers,
      });
      router.push("/evaluation/fin");
    } catch (error) {
      setSaveErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de sauvegarder tes réponses. Vérifie l'espace disponible dans le navigateur.",
      );
    }
  };

  if (!resolvedCondition) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-50 text-zinc-900">
        <p className="rounded-3xl bg-white p-8 text-lg shadow-lg">
          Choisis d&apos;abord une condition sur la page d&apos;accueil.
        </p>
      </div>
    );
  }

  const instructionsOverlay = isInstructionsOpen && (
    <ActivityInstructionsOverlay
      title="Consignes"
      onClose={closeInstructions}
      stepImage={{
        alt: "Étape d'évaluation du modèle",
        height: 540,
        src: "/Hints/StepsEval.png",
        width: 6740,
      }}
    >
      <EvaluationInstructionsContent />
    </ActivityInstructionsOverlay>
  );

  if (cardPage && predictionRows) {
    const verificationLine = verificationMessage && (
      <p
        className={`text-[14px] font-medium ${
          invalidFields.size === 0 ? "text-[#0a7f38]" : "text-[#b42318]"
        }`}
      >
        {verificationMessage}
      </p>
    );

    return (
      <div className="relative flex h-dvh w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat p-[40px] text-[#18181b]" style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}>
        <ActivityInstructionsButton onPress={openInstructions} />
        <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
        <Surface className="relative flex h-full w-full max-w-[1351px] flex-col gap-[16px] p-[32px]">
          <div className="w-full text-black">
            <h1 className="text-[24px] font-bold leading-[1.34]">
              {cardPage === "cards"
                ? "Évaluation: de nouveaux dinosaures"
                : cardPage === "accuracy"
                  ? "Calcule la précision du modèle"
                  : "Qu'en penses-tu ?"}
            </h1>
            <p className="mt-[6px] w-full text-[16px] leading-[1.5]">
              {cardPage === "cards"
                ? "Le modèle n'a jamais vu ces dinosaures. Regarde ce qu'il prédit pour chacun et compare avec leur vrai régime."
                : cardPage === "accuracy"
                  ? "Utilise les résultats pour compter les bonnes et les mauvaises prédictions, puis calcule la précision."
                  : "Réponds aux deux questions pour terminer."}
            </p>
          </div>

          {cardPage === "cards" && (
            <TestCardWalkthrough
              rows={predictionRows}
              features={modelInput.features}
              treeNodes={revealsModelAfterPredicting(experimentCondition) ? trainingResult?.whiteBoxTree : undefined}
              onComplete={() => {
                setCardPage("accuracy");
                setTutorialStep("scaffold-counts");
              }}
            />
          )}

          {cardPage === "accuracy" && (
            <>
              <div className="min-h-0 flex-1 overflow-auto rounded-[20px] bg-white px-[20px] py-[12px]">
                <TestResultsTable rows={predictionRows} />
              </div>
              <AccuracyScaffold
                accuracy={accuracyInputs.accuracy}
                correct={accuracyInputs.correct}
                invalidFields={invalidFields}
                onChange={updateAccuracyInput}
                tutorialStep={tutorialStep}
                onTutorialDismiss={advanceTutorial}
                total={accuracyInputs.total}
                wrong={accuracyInputs.wrong}
              />
              <div className="flex flex-wrap items-center justify-between gap-[14px]">
                <Button
                  className="min-h-[40px] rounded-[22px] border border-[#dedee0] bg-white px-[18px] text-[15px] font-medium text-[#18181b]"
                  onPress={() => setCardPage("cards")}
                >
                  Retour
                </Button>
                <div className="flex items-center gap-[14px]">
                  {verificationLine}
                  <Button
                    className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                    isDisabled={isCheckingAnswers}
                    onPress={verifyAnswers}
                  >
                    Vérifier mes réponses
                  </Button>
                  {allCalculationsAreCorrect && (
                    <Button
                      className="min-h-[40px] rounded-[22px] bg-[#0a7f38] px-[18px] text-[15px] font-medium text-white"
                      onPress={() => setCardPage("reflection")}
                    >
                      Suite
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {cardPage === "reflection" && (
            <>
              <section className="grid w-full flex-1 grid-cols-1 gap-[18px] lg:grid-cols-2">
                {QUESTION_PROMPTS.map((prompt, index) => (
                  <ReflectionPrompt
                    key={prompt}
                    onChange={(value) => updateReflectionAnswer(index, value)}
                    prompt={prompt}
                    value={reflectionAnswers[index] ?? ""}
                  />
                ))}
              </section>
              <div className="flex flex-wrap items-center justify-between gap-[14px]">
                <Button
                  className="min-h-[40px] rounded-[22px] border border-[#dedee0] bg-white px-[18px] text-[15px] font-medium text-[#18181b]"
                  onPress={() => setCardPage("accuracy")}
                >
                  Retour
                </Button>
                <div className="flex items-center gap-[14px]">
                  {saveErrorMessage && (
                    <p className="text-[14px] font-medium text-[#b42318]">{saveErrorMessage}</p>
                  )}
                  <Button
                    className="min-h-[40px] rounded-[22px] bg-[#0a7f38] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                    isDisabled={!canFinishEvaluation}
                    onPress={saveAndFinish}
                  >
                    Sauvegarder mes réponses et finir !
                  </Button>
                </div>
              </div>
            </>
          )}
        </Surface>
        {instructionsOverlay}
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full items-center justify-center overflow-auto bg-cover bg-center bg-no-repeat p-[40px] text-[#18181b]" style={{ backgroundImage: `url('${BACKGROUND_IMAGE}')` }}>
      <ActivityInstructionsButton onPress={openInstructions} />
      <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
      <Surface
        className="relative flex min-h-[calc(100dvh-80px)] w-full max-w-[1351px] flex-col justify-center gap-[24px] overflow-auto p-[40px]"
      >
        <main className="relative flex w-full flex-col justify-center gap-[24px]">
          <div className="w-full text-black">
            <h1 className="text-[24px] font-bold leading-[1.34]">
              Évaluation du modèle
            </h1>
            <p className="mt-[9px] w-full text-[16px] leading-[1.5]">
              Ton modèle arrive-t-il à bien classifier des dinosaures qu&apos;il n&apos;a encore jamais vu ? Calcule sa précision:
            </p>
          </div>

          <section className="flex w-full items-center justify-center overflow-x-auto py-[18px]" aria-label="Modèle à évaluer">
            <div className="flex min-w-max items-center justify-center">
              <div className="w-[545px] shrink-0">
                <TestDataCard
                  displayFeatures={evaluationDataFeatures}
                  tutorialStep={tutorialStep}
                  onTutorialDismiss={advanceTutorial}
                />
              </div>
              <HorizontalSeparator />
              <div className="shrink-0">
                <EvaluationModelCard
                  hasPredicted={hasPredicted}
                  isPredicting={isPredicting}
                  onPredict={predictModel}
                  tutorialStep={tutorialStep}
                  onTutorialDismiss={advanceTutorial}
                />
              </div>
              {predictionRows && (
                <>
                  <HorizontalSeparator />
                  <div className="shrink-0">
                    <PredictionSummary
                      rows={predictionRows}
                      onInspectTable={() => setTableOverlay({ modelInput, rows: predictionRows })}
                      tutorialStep={tutorialStep}
                      onTutorialDismiss={advanceTutorial}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {predictionErrorMessage && (
            <p className="rounded-[12px] bg-white px-[18px] py-[12px] text-[14px] font-medium text-[#b42318]">
              {predictionErrorMessage}
            </p>
          )}

          {predictionRows && (
            <>
              <AccuracyScaffold
                accuracy={accuracyInputs.accuracy}
                correct={accuracyInputs.correct}
                invalidFields={invalidFields}
                onChange={updateAccuracyInput}
                tutorialStep={tutorialStep}
                onTutorialDismiss={advanceTutorial}
                total={accuracyInputs.total}
                wrong={accuracyInputs.wrong}
              />

              <section className="grid w-full grid-cols-1 gap-[18px] lg:grid-cols-2">
                {QUESTION_PROMPTS.map((prompt, index) => (
                  <ReflectionPrompt
                    key={prompt}
                    onChange={(value) => updateReflectionAnswer(index, value)}
                    prompt={prompt}
                    value={reflectionAnswers[index] ?? ""}
                  />
                ))}
              </section>

              <div className="flex flex-wrap items-center justify-end gap-[14px]">
                {verificationMessage && (
                  <p
                    className={`text-[14px] font-medium ${
                      invalidFields.size === 0 ? "text-[#0a7f38]" : "text-[#b42318]"
                    }`}
                  >
                    {verificationMessage}
                  </p>
                )}
                {saveErrorMessage && (
                  <p className="text-[14px] font-medium text-[#b42318]">
                    {saveErrorMessage}
                  </p>
                )}
                <Button
                  className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                  isDisabled={isCheckingAnswers}
                  onPress={verifyAnswers}
                >
                  Vérifier mes réponses
                </Button>
                {canFinishEvaluation && (
                  <Button
                    className="min-h-[40px] rounded-[22px] bg-[#0a7f38] px-[18px] text-[15px] font-medium text-white"
                    onPress={saveAndFinish}
                  >
                    Sauvegarder mes réponses et finir !
                  </Button>
                )}
              </div>
            </>
          )}
        </main>
      </Surface>
      {tableOverlay && (
        <TestTableOverlay
          displayFeatures={evaluationDataFeatures}
          modelInput={tableOverlay.modelInput}
          onClose={() => setTableOverlay(null)}
          rows={tableOverlay.rows}
        />
      )}
      {instructionsOverlay}
    </div>
  );
}
