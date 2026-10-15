"use client";

import { type DeveloperIdentificationKey, type ValidIdentificationKeys } from "./key";
import { type ExperimentCondition } from "@/app/lib/experimentCondition";

// Researcher shortcut: starts a condition with its developer keys (group "dev"),
// so test runs never mix with participant data.

type Visibility = "shown" | "hidden" | "open" | "closed" | "revealed";

type ConditionChoice = {
  id: ExperimentCondition;
  name: string;
  data: Visibility;
  model: Visibility;
  studentsDo?: string;
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  shown: "visibles",
  hidden: "cachées",
  open: "ouvert",
  closed: "fermé",
  revealed: "révélé",
};

const VISIBILITY_STYLES: Record<Visibility, string> = {
  shown: "bg-emerald-50 text-emerald-700",
  open: "bg-emerald-50 text-emerald-700",
  revealed: "bg-sky-50 text-sky-700",
  hidden: "bg-zinc-100 text-zinc-500",
  closed: "bg-zinc-100 text-zinc-500",
};

const CONDITION_CHOICES: Record<ExperimentCondition, ConditionChoice> = {
  C1: {
    id: "C1",
    name: "Glass-box",
    data: "shown",
    model: "open",
    studentsDo: "Étiquettent, choisissent les caractéristiques, construisent l'arbre",
  },
  C2: {
    id: "C2",
    name: "Grey-box",
    data: "shown",
    model: "closed",
    studentsDo: "Étiquettent et choisissent les caractéristiques",
  },
  C3: {
    id: "C3",
    name: "Black-box",
    data: "hidden",
    model: "closed",
    studentsDo: "Lisent les fiches, le reste est fait pour eux",
  },
  C4: { id: "C4", name: "Données seules", data: "shown", model: "closed" },
  C5: { id: "C5", name: "Modèle seul", data: "hidden", model: "revealed" },
  C6: { id: "C6", name: "Tout visible", data: "shown", model: "revealed" },
  C7: { id: "C7", name: "Rien de visible", data: "hidden", model: "closed" },
};

const ORIGINAL_ACTIVITY: ExperimentCondition[] = ["C1", "C2", "C3"];

// Rows: data shown / hidden. Columns: model closed / revealed after the guess.
const NEW_ACTIVITIES: { row: string; cells: [ExperimentCondition, ExperimentCondition] }[] = [
  { row: "Données visibles", cells: ["C4", "C6"] },
  { row: "Données cachées", cells: ["C7", "C5"] },
];

export function describeCondition(condition: ExperimentCondition) {
  const choice = CONDITION_CHOICES[condition];

  return `${choice.name} · données ${VISIBILITY_LABELS[choice.data]}, modèle ${VISIBILITY_LABELS[choice.model]}`;
}

function keysFor(condition: ExperimentCondition): ValidIdentificationKeys {
  return {
    condition,
    group: "dev",
    keys: [`${condition}devX`, `${condition}devY`] as DeveloperIdentificationKey[],
  };
}

function VisibilityChip({ label, value }: { label: string; value: Visibility }) {
  return (
    <span className={`rounded-full px-2 py-[2px] text-xs font-medium ${VISIBILITY_STYLES[value]}`}>
      {label} {VISIBILITY_LABELS[value]}
    </span>
  );
}

function ConditionCard({
  condition,
  onChoose,
}: {
  condition: ExperimentCondition;
  onChoose: (keys: ValidIdentificationKeys) => void;
}) {
  const choice = CONDITION_CHOICES[condition];

  return (
    <button
      className="group flex h-full w-full flex-col items-start gap-2 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition hover:border-sky-500 hover:shadow-md focus-visible:outline-2 focus-visible:outline-sky-500"
      data-condition-choice={choice.id}
      onClick={() => onChoose(keysFor(choice.id))}
      type="button"
    >
      <span className="flex w-full items-center justify-between gap-2">
        <span className="text-base font-semibold text-zinc-900">
          {choice.id} · {choice.name}
        </span>
        <span className="text-sm font-semibold text-sky-600 opacity-0 transition group-hover:opacity-100">
          Lancer →
        </span>
      </span>
      <span className="flex flex-wrap gap-1">
        <VisibilityChip label="Données" value={choice.data} />
        <VisibilityChip label="Modèle" value={choice.model} />
      </span>
      {choice.studentsDo ? <span className="text-sm text-zinc-500">{choice.studentsDo}</span> : null}
    </button>
  );
}

export function ConditionPicker({
  onChoose,
}: {
  onChoose: (keys: ValidIdentificationKeys) => void;
}) {
  return (
    <div className="flex w-full flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Nouvelles activités · étude 2×2</h2>
          <p className="text-sm text-zinc-500">
            Mêmes actions pour tous : lire les fiches, deviner, évaluer. Seul ce qu&apos;on montre change.
          </p>
        </div>
        <div className="grid grid-cols-[120px_1fr_1fr] items-stretch gap-3">
          <span />
          <span className="text-center text-sm font-medium text-zinc-500">Modèle fermé</span>
          <span className="text-center text-sm font-medium text-zinc-500">
            Modèle révélé après la devinette
          </span>
          {NEW_ACTIVITIES.map(({ row, cells }) => (
            <div className="contents" key={row}>
              <span className="flex items-center text-sm font-medium text-zinc-500">{row}</span>
              {cells.map((condition) => (
                <ConditionCard condition={condition} key={condition} onChoose={onChoose} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">Activité originale · référence</h2>
          <p className="text-sm text-zinc-500">
            Inchangée. Les élèves font eux-mêmes plus ou moins d&apos;étapes.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ORIGINAL_ACTIVITY.map((condition) => (
            <ConditionCard condition={condition} key={condition} onChoose={onChoose} />
          ))}
        </div>
      </section>
    </div>
  );
}
