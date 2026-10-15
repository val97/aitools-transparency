"use client";

import { useMemo, useState } from "react";
import { Button } from "@heroui/react";
import { GoGear } from "react-icons/go";
import { ModelTreeView } from "@/app/modelling/ModelReveal";
import { type TrainingTableRow } from "@/app/modelling/tableRows";
import { type WhiteBoxTreeNode } from "@/app/modelling/trainingState";
import { whiteBoxPathForRow } from "@/app/modelling/whiteBoxTree";

export type TestRow = Record<string, string | number | boolean | undefined>;

const LABEL_COLUMN = "régime_alimentaire";
const PREDICTION_COLUMN = "régime_alimentaire_prédit";
const PANEL_CLASS_NAME = "flex flex-col gap-[12px] rounded-[20px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_14px_28px_rgba(0,0,0,0.08)]";

function formatValue(value: string | number | boolean | undefined) {
  const text = String(value ?? "");

  if (text.toLowerCase() === "true") {
    return "vrai";
  }

  if (text.toLowerCase() === "false") {
    return "faux";
  }

  return text;
}

export function DietBadge({ diet, small = false }: { diet: string; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium text-white ${
        small ? "min-h-[24px] px-[10px] text-[12px]" : "min-h-[32px] px-[14px] text-[14px]"
      } ${diet === "carnivore" ? "bg-[#ff383c]" : "bg-[#17c964]"}`}
    >
      {diet === "carnivore" ? "Carnivore" : "Herbivore"}
    </span>
  );
}

// The predictions seen so far. Students compare the two columns themselves
// to count correct and wrong predictions.
export function TestResultsTable({ rows }: { rows: TestRow[] }) {
  return (
    <table className="w-full border-collapse text-left text-[13px] text-[#18181b]">
      <thead>
        <tr className="border-b border-[#dedee0] text-[#52525b]">
          <th className="px-[6px] py-[4px] font-medium">nom</th>
          <th className="px-[6px] py-[4px] font-medium">prédiction</th>
          <th className="px-[6px] py-[4px] font-medium">vrai régime</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={String(row.nom ?? index)} className="border-b border-[#f0f0f0]">
            <td className="px-[6px] py-[2px] font-medium">{String(row.nom ?? "")}</td>
            <td className="px-[6px] py-[2px]"><DietBadge diet={String(row[PREDICTION_COLUMN] ?? "")} small /></td>
            <td className="px-[6px] py-[2px]"><DietBadge diet={String(row[LABEL_COLUMN] ?? "")} small /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function HiddenModelCard({ prediction }: { prediction: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center rounded-[20px] bg-white/70 p-[12px]">
      <article className="relative flex h-[200px] w-[275px] flex-col items-center justify-center gap-[12px] rounded-[20px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06),0_14px_28px_rgba(0,0,0,0.08)]">
        <GoGear aria-hidden="true" className="absolute left-[10px] top-[10px] size-[20px]" />
        <GoGear aria-hidden="true" className="absolute right-[10px] top-[10px] size-[20px]" />
        <GoGear aria-hidden="true" className="absolute bottom-[10px] left-[10px] size-[20px]" />
        <GoGear aria-hidden="true" className="absolute bottom-[10px] right-[10px] size-[20px]" />
        <h2 className="text-[24px] font-bold text-black">Modèle</h2>
        <p className="text-[14px] text-[#52525b]">Le modèle prédit:</p>
        <DietBadge diet={prediction} />
      </article>
    </div>
  );
}

// C4 and C5 evaluation: the new dinosaurs arrive one card at a time. Each
// card shows the dinosaur's data, the model's prediction and the real diet.
// C5 also sees the dinosaur's path down the tree; C4 only the closed model.
export function TestCardWalkthrough({
  rows,
  features,
  treeNodes,
  onComplete,
}: {
  rows: TestRow[];
  features: string[];
  treeNodes?: WhiteBoxTreeNode[];
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const row = rows[index];
  const seenRows = rows.slice(0, index + 1);
  const paths = useMemo(
    () => (treeNodes ? rows.map((testRow) => whiteBoxPathForRow(testRow as TrainingTableRow, treeNodes)) : []),
    [rows, treeNodes],
  );
  const dinosaursByLeaf = useMemo(() => {
    const byLeaf = new Map<string, string[]>();

    paths.slice(0, index + 1).forEach((path, rowIndex) => {
      const leaf = path[path.length - 1];

      if (leaf) {
        byLeaf.set(leaf.id, [...(byLeaf.get(leaf.id) ?? []), String(rows[rowIndex]?.nom ?? "")]);
      }
    });

    return byLeaf;
  }, [index, paths, rows]);
  const highlightedIds = useMemo(
    () => new Set((paths[index] ?? []).map((node) => node.id)),
    [index, paths],
  );

  if (!row) {
    return null;
  }

  const prediction = String(row[PREDICTION_COLUMN] ?? "");
  const realDiet = String(row[LABEL_COLUMN] ?? "");
  const isLastRow = index === rows.length - 1;

  return (
    <div className="flex min-h-0 w-full flex-1 gap-[20px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[16px]">
        <section className={PANEL_CLASS_NAME} aria-label="Nouveau dinosaure">
          <div className="flex items-baseline justify-between gap-[16px]">
            <h2 className="text-[20px] font-bold leading-[1.3] text-black">
              Un nouveau dinosaure arrive: {String(row.nom ?? "")}
            </h2>
            <p className="text-[14px] font-medium text-[#71717a]">
              Dinosaure {index + 1}/{rows.length}
            </p>
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {features.map((feature) => (
              <span
                key={feature}
                className="inline-flex min-h-[30px] items-center rounded-full bg-[#ebebec] px-[12px] text-[14px] font-medium text-[#18181b]"
              >
                {feature}: {formatValue(row[feature])}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-[10px] text-[15px] text-black">
            <span>Le modèle prédit:</span>
            <DietBadge diet={prediction} />
            <span className="ml-[12px]">Vrai régime:</span>
            <DietBadge diet={realDiet} />
            <span className="font-semibold">{prediction === realDiet ? "✅ Correct" : "❌ Erreur"}</span>
          </div>
        </section>
        {treeNodes ? (
          <ModelTreeView nodes={treeNodes} highlightedIds={highlightedIds} dinosaursByLeaf={dinosaursByLeaf} showsCounts={false} />
        ) : (
          <HiddenModelCard prediction={prediction} />
        )}
      </div>

      <aside className={`${PANEL_CLASS_NAME} w-[360px] shrink-0`}>
        <p className="text-[16px] font-semibold text-black">Résultats</p>
        <div className="min-h-0 flex-1 overflow-auto">
          <TestResultsTable rows={seenRows} />
        </div>
        <Button
          className="min-h-[40px] rounded-[22px] bg-[#006fee] px-[18px] text-[15px] font-medium text-white"
          onPress={() => (isLastRow ? onComplete() : setIndex((current) => current + 1))}
        >
          {isLastRow ? "Calculer la précision" : "Dinosaure suivant"}
        </Button>
      </aside>
    </div>
  );
}
