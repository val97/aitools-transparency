"use client";

import Link from "next/link";
import { useState } from "react";
import { ConditionPicker, describeCondition } from "./components/ConditionPicker";
import { HomeIdentificationField } from "./components/HomeIdentificationField";
import { type ValidIdentificationKeys } from "./components/key";
import { startExperiment } from "./lib/experimentCollection";
import { type ExperimentCondition, saveExperimentCondition } from "./lib/experimentCondition";
import Image from "next/image"


const PRESENTATION_TEXT = (
  <>
    <strong>Ta Mission :</strong> Tu es archéologue.
    Des centaines de fossiles de dinosaures ont été découverts, mais personne ne sait encore si chacun est{" "}
    <strong>Carnivore ou Herbivore</strong>. <br />
    <strong>Ton rôle : </strong>
    Apprendre à un algorithme à les classer automatiquement.
  </>
);

type StartMode = "students" | "test";

const START_MODES: { id: StartMode; label: string }[] = [
  { id: "students", label: "Élèves" },
  { id: "test", label: "Tester une condition" },
];

export default function Home() {
  const [isIdentificationValidated, setIsIdentificationValidated] = useState(false);
  const [startMode, setStartMode] = useState<StartMode>("students");
  const [testCondition, setTestCondition] = useState<ExperimentCondition | null>(null);

  const validateIdentification = (validatedKeys: ValidIdentificationKeys) => {
    saveExperimentCondition(validatedKeys.condition);
    startExperiment({
      condition: validatedKeys.condition,
      group: validatedKeys.group,
      keys: validatedKeys.keys,
    });
    setTestCondition(validatedKeys.group === "dev" ? validatedKeys.condition : null);
    setIsIdentificationValidated(true);
  };

  const backToStart = () => {
    setIsIdentificationValidated(false);
    setTestCondition(null);
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-zinc-50 bg-cover bg-center bg-no-repeat text-zinc-900"
      style={{ backgroundImage: "url('/home_background.png')" }}
    >
      <main className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-8 rounded-3xl border border-zinc-200 bg-white p-10 shadow-lg ">
        <h1 className="text-4xl font-bold">Bienvenue dans AI Tools !</h1>
        {!isIdentificationValidated ? (
          <>
            <div
              className="flex rounded-full bg-zinc-100 p-1"
              role="tablist"
              aria-label="Comment commencer"
            >
              {START_MODES.map((mode) => (
                <button
                  aria-selected={startMode === mode.id}
                  className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                    startMode === mode.id
                      ? "bg-white text-zinc-900 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-700"
                  }`}
                  data-start-mode={mode.id}
                  key={mode.id}
                  onClick={() => setStartMode(mode.id)}
                  role="tab"
                  type="button"
                >
                  {mode.label}
                </button>
              ))}
            </div>
            {startMode === "students" ? (
              <div className="flex w-full flex-col items-center gap-4">
                <p className="text-center text-lg text-zinc-600">
                  Entrez la clé de chaque élève du groupe, puis cliquez sur Valider.
                </p>
                <HomeIdentificationField onValidated={validateIdentification} />
              </div>
            ) : (
              <div className="flex w-full flex-col gap-4">
                <p className="text-center text-sm text-zinc-500">
                  Pour les chercheurs : un clic lance la condition avec des clés de test. Ces
                  sessions sont enregistrées à part et ne se mélangent pas aux données des élèves.
                </p>
                <ConditionPicker onChoose={validateIdentification} />
              </div>
            )}
          </>
        ) : (
          <>
            {testCondition ? (
              <div className="flex items-center gap-3 rounded-full bg-amber-50 px-4 py-2 text-sm text-amber-800">
                <span>
                  Mode test : <strong>{testCondition}</strong> · {describeCondition(testCondition)}
                </span>
                <button className="font-semibold underline underline-offset-4" onClick={backToStart} type="button">
                  Changer
                </button>
              </div>
            ) : null}
            <p className="max-w-4xl text-left text-lg text-zinc-600 ">
              {PRESENTATION_TEXT}
            </p>
            <Image
                    alt="All tasks overview"
                    className="mt-[4px] h-auto w-full"
                    height={621}
                    priority
                    src="/Hints/FourSteps.png"
                    width={3720}
                  />
            <Link
              href="/data_labelling"
              className="rounded-full bg-sky-600 px-8 py-3 text-sm font-semibold text-white transition hover:bg-sky-500 "
            >
              C&apos;est parti !
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
