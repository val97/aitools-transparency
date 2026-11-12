"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { GoGear } from "react-icons/go";
import { DietBadge } from "@/app/evaluation/TestCardWalkthrough";
import {
  logScreen,
  markRun1Start,
  saveRun1End,
  type Run1Card,
} from "@/app/lib/experimentCollection";
import { ARCHAEOLOGIST_DIETS, PREPARED_FEATURES } from "@/app/lib/fixedData";
import { MODEL_CONFIG } from "@/app/modelling/modelConfig";
import { loadCsvTable, type Run1DataFile, type TrainingTableRow } from "@/app/modelling/tableRows";
import { buildGreedyGiniTree, predictRowWithWhiteBoxTree } from "@/app/modelling/whiteBoxTree";

// Run 1: a short black-box warm-up, identical for every condition, before the
// activity itself (Run 2), on each group's computer. Students
// only see what the program answers, which gives a baseline of what they think
// it does before any transparency (they write it on the paper sheet). The
// program is the C4-C7 activity's model, built exactly as the modelling page
// builds it (same data, archaeologists' labels and prepared features); nothing
// of the data, the tree or the accuracy is shown.
//
// The dinosaurs shown are the rows of public/data/run1/df_test.csv (same
// format as public/data/), in file order: edit that file to change them. Each
// is shown as its card: public/data/run1/cards/<nom>.png, else the activity's
// own sheet in public/dino_sheets/, else a plain card.
// Screens avoid the words learn, train, data, model, tree, rule, accuracy, AI.

const CARDS_FILE: Run1DataFile = "run1/df_test.csv";
const LABEL_COLUMN = "régime_alimentaire";
const CARD_COUNT = 6;

type Stage = "intro" | "cards" | "transition";
type ShownCard = Run1Card & { row: TrainingTableRow };
type Run1Program = { features: string[]; cards: ShownCard[] };

const PRIMARY_BUTTON_CLASS_NAME =
  "rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-zinc-300";

async function runProgram(): Promise<Run1Program> {
  const features = PREPARED_FEATURES;
  const [cardsTable, nodes] = await Promise.all([
    loadCsvTable(CARDS_FILE),
    buildGreedyGiniTree({ features, labels: ARCHAEOLOGIST_DIETS, dataFile: MODEL_CONFIG.data }),
  ]);
  const cards = cardsTable.rows.slice(0, CARD_COUNT).map<ShownCard>((row) => ({
    nom: row.nom,
    programAnswer: predictRowWithWhiteBoxTree(row, nodes),
    correctGroup: row[LABEL_COLUMN],
    row,
  }));

  return { features, cards };
}

const CARD_SOURCES = (name: string) => [`/data/run1/cards/${name}.png`, `/dino_sheets/${name}.png`];
const CARD_ASPECT = "aspect-[636/904]";

// The dinosaur's card, trying each source in turn.
function RunCard({ name, className = "" }: { name: string; className?: string }) {
  const sources = CARD_SOURCES(name);
  const [sourceIndex, setSourceIndex] = useState(0);
  const source = sources[sourceIndex];

  return (
    <div className={`relative ${CARD_ASPECT} overflow-hidden rounded-[18px] bg-[#f3eee7] shadow-[-7px_7px_4px_0px_rgba(0,0,0,0.25)] ${className}`}>
      {source ? (
        <Image
          fill
          unoptimized
          alt={name}
          className="object-cover"
          sizes="320px"
          src={source}
          onError={() => setSourceIndex((current) => current + 1)}
        />
      ) : (
        <div className="flex h-full items-center justify-center p-4 text-center text-xl font-bold text-zinc-700">{name}</div>
      )}
    </div>
  );
}

// The program's answer, stamped on the card like the labels in the activity.
function ProgramStamp({ diet }: { diet: string }) {
  const isCarnivore = diet === "carnivore";

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.span
        animate={{ opacity: 1, rotate: -14, scale: 1 }}
        className={`rounded-xl border-[5px] bg-white/85 px-4 py-1 text-[28px] font-black uppercase tracking-wider shadow-lg ${
          isCarnivore ? "border-[#ff383c] text-[#ff383c]" : "border-[#17c964] text-[#17c964]"
        }`}
        initial={{ opacity: 0, rotate: -30, scale: 2.2 }}
        transition={{ delay: 0.45, type: "spring", stiffness: 260, damping: 16 }}
      >
        {isCarnivore ? "Carnivore" : "Herbivore"}
      </motion.span>
    </div>
  );
}

const FAN_ANGLES = [-14, 0, 14];

function Intro({ cardNames, onNext }: { cardNames: string[]; onNext: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="relative h-[230px] w-[340px]">
        {cardNames.slice(0, FAN_ANGLES.length).map((name, index) => (
          <motion.div
            animate={{ opacity: 1, rotate: FAN_ANGLES[index], x: (index - 1) * 90, y: index === 1 ? -8 : 6 }}
            className="absolute left-1/2 top-0 -ml-[75px] w-[150px]"
            initial={{ opacity: 0, rotate: 0, x: 0, y: 30 }}
            key={name}
            transition={{ delay: 0.1 * index, type: "spring", stiffness: 140, damping: 16 }}
            style={{ zIndex: index === 1 ? 2 : 1 }}
          >
            <RunCard name={name} />
          </motion.div>
        ))}
      </div>
      <p className="text-2xl font-semibold">Un programme informatique classe des dinosaures en groupes.</p>
      <div className="flex items-center gap-3 text-zinc-600">
        Les groupes : <DietBadge diet="carnivore" /> <DietBadge diet="herbivore" />
      </div>
      <button className={PRIMARY_BUTTON_CLASS_NAME} onClick={onNext} type="button">
        Continuer
      </button>
    </div>
  );
}

function CardWalkthrough({ cards, onComplete }: { cards: ShownCard[]; onComplete: () => void }) {
  const [index, setIndex] = useState(0);
  const card = cards[index];

  if (!card) {
    return null;
  }

  const isLastCard = index === cards.length - 1;
  const isDifferent = card.programAnswer !== card.correctGroup;

  return (
    <div className="flex w-full flex-col gap-5" data-run1-card={card.nom}>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-bold">{card.nom}</h2>
        <div aria-label={`Dinosaure ${index + 1} sur ${cards.length}`} className="flex gap-2">
          {cards.map((shownCard, dotIndex) => (
            <span
              className={`size-[10px] rounded-full transition ${dotIndex <= index ? "bg-sky-600" : "bg-zinc-200"}`}
              key={shownCard.nom}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-10">
        <AnimatePresence mode="wait">
          <motion.div
            animate={{ opacity: 1, rotate: 0, x: 0 }}
            className="relative h-[min(400px,52vh)]"
            exit={{ opacity: 0, rotate: -6, x: -80 }}
            initial={{ opacity: 0, rotate: 6, x: 80 }}
            key={card.nom}
            transition={{ duration: 0.35 }}
          >
            <RunCard className="h-full" name={card.nom} />
            <ProgramStamp diet={card.programAnswer} />
          </motion.div>
        </AnimatePresence>

        <div className="flex flex-col gap-4" key={card.nom}>
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 px-5 py-4">
            <span className="flex items-center gap-2 font-medium text-zinc-600">
              <GoGear aria-hidden="true" className="size-[18px]" /> Réponse du programme
            </span>
            <DietBadge diet={card.programAnswer} />
          </div>
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${
              isDifferent ? "border-amber-300 bg-amber-50" : "border-zinc-200"
            }`}
            initial={{ opacity: 0, y: 12 }}
            transition={{ delay: 1 }}
          >
            <span className="font-medium text-zinc-600">Le bon groupe</span>
            <DietBadge diet={card.correctGroup} />
          </motion.div>
          <div className="flex justify-end pt-2">
            <button
              className={PRIMARY_BUTTON_CLASS_NAME}
              onClick={() => (isLastCard ? onComplete() : setIndex((current) => current + 1))}
              type="button"
            >
              {isLastCard ? "Continuer" : "Dinosaure suivant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Run1Activity({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState<Stage>("intro");
  const [program, setProgram] = useState<Run1Program | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  const loadProgram = useCallback(
    () =>
      runProgram()
        .then(setProgram)
        .catch(() => setHasFailed(true)),
    [],
  );

  const retry = () => {
    setHasFailed(false);
    loadProgram();
  };

  // The intro is logged by the start page; the next screens here.
  useEffect(() => {
    if (stage !== "intro") {
      logScreen(`run1_${stage}`);
    }
  }, [stage]);

  // Starts on the intro screen so the answers are ready by the cards.
  useEffect(() => {
    markRun1Start();
    loadProgram();
  }, [loadProgram]);

  if (hasFailed && stage !== "intro") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-zinc-600">Le programme ne répond pas. Le serveur Python est-il lancé ?</p>
        <button className={PRIMARY_BUTTON_CLASS_NAME} onClick={retry} type="button">
          Réessayer
        </button>
      </div>
    );
  }

  if (stage === "intro") {
    return <Intro cardNames={program?.cards.map((card) => card.nom) ?? []} onNext={() => setStage("cards")} />;
  }

  if (stage === "cards" && program) {
    return (
      <CardWalkthrough
        cards={program.cards}
        onComplete={() => {
          saveRun1End(
            program.cards.map(({ nom, programAnswer, correctGroup }) => ({ nom, programAnswer, correctGroup })),
            program.features,
          );
          setStage("transition");
        }}
      />
    );
  }

  if (stage === "transition") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <p className="text-2xl font-semibold">Maintenant, vous allez découvrir comment ce programme fonctionne.</p>
        <button className={PRIMARY_BUTTON_CLASS_NAME} onClick={onComplete} type="button">
          Continuer
        </button>
      </div>
    );
  }

  return <p className="text-zinc-500">Chargement…</p>;
}
