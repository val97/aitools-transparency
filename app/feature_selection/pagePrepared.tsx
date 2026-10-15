"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { ActivityInstructionsButton, DataTable, type SortConfig } from "@/app/components";
import { saveFeatureSelectionEnd } from "@/app/lib/experimentCollection";
import { type DataExposure } from "@/app/lib/experimentCondition";
import { writeSelectedFeatures } from "@/app/lib/featureSelectionState";
import { PREPARED_FEATURES, PREPARED_FEATURES_REASON } from "@/app/lib/fixedData";
import { compareCellValues, loadLabelledTrainingRows, type TrainingTableRow } from "@/app/modelling/tableRows";

const LABEL_COLUMN = "régime_alimentaire";
const EXPLAIN_PROMPT = "Explique à un ami ce que l'ordinateur va recevoir pour apprendre.";
const TABLE_HEADERS = ["nom", LABEL_COLUMN, ...PREPARED_FEATURES];

type PreparedDataProps = {
  exposure: DataExposure;
  onShowInstructions?: () => void;
};

// C4 and C5: the archaeologists already labelled the dinosaurs and chose the
// features. C4 shows the prepared table; C5 only says that it exists. Both
// answer the same question.
export default function PreparedData({ exposure, onShowInstructions }: PreparedDataProps) {
  const router = useRouter();
  const [rows, setRows] = useState<TrainingTableRow[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [explanation, setExplanation] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isExposed = exposure === "exposed";

  useEffect(() => {
    if (!isExposed) {
      return;
    }

    let isActive = true;

    loadLabelledTrainingRows("df_train.csv")
      .then((table) => {
        if (isActive) {
          setRows(table.rows);
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(error instanceof Error ? error.message : "Une erreur est survenue.");
        }
      });

    return () => {
      isActive = false;
    };
  }, [isExposed]);

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

  const goToNextStep = () => {
    if (!explanation.trim()) {
      return;
    }

    writeSelectedFeatures(PREPARED_FEATURES);
    saveFeatureSelectionEnd({
      selectedFeatures: PREPARED_FEATURES,
      featureSelectionReason: [EXPLAIN_PROMPT, explanation].join("\n"),
    });
    router.push("/modelling");
  };

  return (
    <div
      className="relative flex min-h-dvh w-full items-center justify-center overflow-hidden bg-cover bg-center bg-no-repeat px-[50px] py-[60px] text-[#18181b]"
      style={{ backgroundImage: "url('/background.png')" }}
    >
      {onShowInstructions && <ActivityInstructionsButton onPress={onShowInstructions} />}
      <div aria-hidden="true" className="absolute inset-0 bg-black/35" />
      <main className="relative flex max-h-[calc(100dvh-120px)] w-full max-w-[1280px] flex-col gap-[24px] overflow-hidden rounded-[24px] border border-[#dedee0] bg-[#f5f5f5] p-[32px] shadow-[-7px_7px_4px_0px_rgba(0,0,0,0.25)]">
        <div className="flex flex-col gap-[8px]">
          <p className="text-[16px] font-medium text-[#52525b]">Étape 2</p>
          <h1 className="text-[40px] font-bold leading-[1.1]">Préparation des données</h1>
          <p className="max-w-[1100px] text-[18px] leading-[1.45] text-[#3f3f46]">
            {isExposed
              ? "L'équipe d'archéologues a préparé ce tableau pour l'algorithme. Il contient le régime alimentaire qu'ils ont donné à chaque dinosaure et les 4 caractéristiques qu'ils ont choisies."
              : "Les données ont été préparées pour l'algorithme. Il est prêt à apprendre."}
          </p>
        </div>

        {isExposed && (
          <section className="flex flex-col gap-[10px] rounded-[16px] bg-white px-[20px] py-[16px]" aria-label="Caractéristiques choisies">
            <div className="flex flex-wrap items-center gap-[10px]">
              <p className="text-[15px] font-semibold">Caractéristiques choisies par l&apos;équipe:</p>
              {PREPARED_FEATURES.map((feature) => (
                <span
                  key={feature}
                  className="inline-flex min-h-[32px] items-center rounded-full bg-[#d9ecff] px-[12px] text-[14px] font-medium text-[#005bc4]"
                >
                  {feature}
                </span>
              ))}
            </div>
            <p className="text-[14px] leading-[1.4] text-[#52525b]">«&nbsp;{PREPARED_FEATURES_REASON}&nbsp;»</p>
          </section>
        )}

        {isExposed && (
          <div className="min-h-0 overflow-auto rounded-[8px] border border-[#dedee0] bg-white">
            {errorMessage ? (
              <p className="p-[20px] text-[16px] text-[#b42318]">{errorMessage}</p>
            ) : (
              <DataTable
                headers={TABLE_HEADERS}
                rows={sortedRows}
                sortConfig={sortConfig}
                onSort={updateSort}
                getRowKey={(row) => row.nom}
              />
            )}
          </div>
        )}

        <label className="flex flex-col gap-[6px] text-[15px] font-semibold text-[#27272a]">
          {EXPLAIN_PROMPT}
          <textarea
            className="min-h-[78px] resize-none rounded-[10px] border border-[#c9c9cf] bg-white px-[12px] py-[10px] text-[15px] font-normal leading-[1.4] outline-none transition focus:border-[#006fee]"
            onChange={(event) => setExplanation(event.target.value)}
            value={explanation}
          />
        </label>

        <div className="flex justify-end">
          <Button
            className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
            isDisabled={!explanation.trim()}
            onPress={goToNextStep}
          >
            Suite
          </Button>
        </div>
      </main>
    </div>
  );
}
