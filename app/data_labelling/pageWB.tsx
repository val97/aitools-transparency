"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TextArea } from "@heroui/react";
import {
  ActivityInstructionsButton,
  DataLabellingCenterTutorialHint,
  DataLabellingTutorialTarget,
  type DataLabellingTutorialStep,
} from "@/app/components";
import { Dino, type DinoName } from "@/app/components/Dino";
import { Button as DietButton } from "@/app/components/Button";
import { Separator } from "@/app/components/Separator";
import { DinoBucket } from "@/app/components/DinoBucket";
import { saveDataLabellingEnd } from "@/app/lib/experimentCollection";
import { clearDinoLabels, saveDinoLabels, type DinoDiet } from "@/app/lib/dinoLabels";
import { SHEETS_TO_READ } from "@/app/lib/fixedData";

const imgWhiteBox1 = "/background.png";
const pageClassName = "content-stretch flex h-dvh w-full items-center justify-center overflow-hidden px-[clamp(14px,3.5vw,50px)] py-[clamp(14px,5dvh,60px)] relative";
const contentClassName = "content-stretch flex flex-[1_0_0] gap-[clamp(14px,3vw,50px)] h-full w-full items-stretch justify-end min-h-0 min-w-0 relative";
const leftPanelClassName = "flex flex-1 min-w-[clamp(120px,14vw,180px)] pt-[clamp(12px,5dvh,60px)] pl-[clamp(0px,3vw,50px)] flex-col justify-center items-end gap-[clamp(16px,5dvh,60px)] self-stretch overflow-visible";
const stackedCardsClassName = "content-center flex flex-nowrap h-[clamp(150px,25dvh,255px)] items-center justify-end pr-[clamp(80px,13.4dvh,137px)] relative shrink-0 self-end";
const stackedDinoClassName = "content-stretch flex h-[clamp(150px,25dvh,255px)] items-center mr-[clamp(-137px,-13.4dvh,-80px)] relative shrink-0 w-[clamp(106px,17.6dvh,180px)]";
const mainCardClassName = "content-stretch flex aspect-[636.2648315429688/904] h-auto max-h-full w-[min(42vw,calc((100dvh-32px)*0.704))] min-w-[220px] items-center justify-center relative shrink-0";
const mainDinoClassName = "aspect-[636.2648315429688/904] content-stretch flex h-full w-full items-center relative shrink-0";
const sidePanelClassName = "content-stretch flex flex-col gap-[clamp(12px,3dvh,36px)] h-full min-h-0 items-center justify-center relative shrink-0 w-[clamp(220px,23vw,333px)]";
const bucketDinoClassName = "content-stretch flex h-[clamp(72px,12.5dvh,128px)] items-center relative shrink-0 w-[clamp(51px,8.8dvh,90px)]";

type DinoState = "left" | "selected" | "herbivore" | "carnivore";

type DinoItem = {
  name: DinoName;
  state: DinoState;
};

type WhiteBoxProps = {
  onShowInstructions?: () => void;
  tutorialStep?: DataLabellingTutorialStep;
  onTutorialDismiss?: () => void;
};


const dinoDiets: Record<DinoName, "herbivore" | "carnivore"> = {
  Apatosaurus: "herbivore",
  Brachiosaurus: "herbivore",
  Gallimimus: "carnivore",
  Megalosaurus: "carnivore",
  Plateosaurus: "herbivore",
  Spinosaurus: "carnivore",
  Stegosaurus: "herbivore",
  Styracosaurus: "herbivore",
  Tyrannosaurus: "carnivore",
  Utahraptor: "carnivore",
};

// The sheets left to read come first, the first one open; the others are
// already in their pile, with their correct label.
function initialDinos(diets: Record<DinoName, DinoDiet>): DinoItem[] {
  const toRead = SHEETS_TO_READ as DinoName[];
  const alreadyAnnotated = (Object.keys(diets) as DinoName[]).filter((name) => !toRead.includes(name));

  return [
    ...alreadyAnnotated.map((name) => ({ name, state: diets[name] })),
    ...toRead.map((name, index) => ({ name, state: index === 0 ? ("selected" as const) : ("left" as const) })),
  ];
}

export default function WhiteBox({
  onShowInstructions,
  tutorialStep = null,
  onTutorialDismiss = () => {},
}: WhiteBoxProps) {
  const [dinos, setDinos] = useState<DinoItem[]>(() => initialDinos(dinoDiets));
  const [activeBucket, setActiveBucket] = useState<"herbivore" | "carnivore" | null>(null);
  const [notes, setNotes] = useState("");
  const [showWrongLabelWarning, setShowWrongLabelWarning] = useState(false);

  useEffect(() => {
    clearDinoLabels();
  }, []);

  const remainingDinos = dinos.filter((dino) => dino.state === "left").map((dino) => dino.name);
  const selectedDino = dinos.find((dino) => dino.state === "selected")?.name ?? null;
  const herbivoreDinos = dinos.filter((dino) => dino.state === "herbivore").map((dino) => dino.name);
  const carnivoreDinos = dinos.filter((dino) => dino.state === "carnivore").map((dino) => dino.name);
  const dinoCount = remainingDinos.length;
  const hasLabelledAllDinos = dinos.every((dino) => dino.state === "herbivore" || dino.state === "carnivore");
  const labels = useMemo(
    () =>
      Object.fromEntries(
        dinos
          .filter((dino) => dino.state === "herbivore" || dino.state === "carnivore")
          .map((dino) => [dino.name, dino.state as DinoDiet]),
      ),
    [dinos],
  );

  useEffect(() => {
    if (!hasLabelledAllDinos) {
      return;
    }

    saveDinoLabels(labels);
  }, [hasLabelledAllDinos, labels]);

  const renderBucketCards = (bucketDinos: DinoName[]) => {
    return bucketDinos.map((dino) => (
      <Dino key={dino} className={bucketDinoClassName} dino={dino} labelled1 size="sm" />
    ));
  };

  const assignSelectedDino = (diet: "herbivore" | "carnivore") => {
    if (!selectedDino) {
      return;
    }

    if (dinoDiets[selectedDino] !== diet) {
      setShowWrongLabelWarning(true);
    }

    setDinos((currentDinos) => {
      const selectedIndex = currentDinos.findIndex((dino) => dino.state === "selected");

      if (selectedIndex === -1) {
        return currentDinos;
      }

      let promotedNextDino = false;

      return currentDinos.map((dino, index) => {
        if (index === selectedIndex) {
          return { ...dino, state: diet };
        }

        if (!promotedNextDino && dino.state === "left") {
          promotedNextDino = true;
          return { ...dino, state: "selected" };
        }

        return dino;
      });
    });

    setActiveBucket(diet);
  };

  return (
    <div className={pageClassName} data-name="WhiteBox - 1" data-node-id="4:13">
      {onShowInstructions && <ActivityInstructionsButton onPress={onShowInstructions} />}
      {tutorialStep === 1 && (
        <DataLabellingCenterTutorialHint label="1) Lis la fiche" onDismiss={onTutorialDismiss} />
      )}
      {showWrongLabelWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-[24px] py-[24px] backdrop-blur-[2px]">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="wrong-label-warning-title"
            className="w-full max-w-[560px] rounded-[24px] border border-[#dedee0] bg-white p-[28px] text-[#18181b] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_-6px_12px_rgba(0,0,0,0.03),0_14px_28px_rgba(0,0,0,0.08)]"
          >
            <h2 id="wrong-label-warning-title" className="text-[26px] font-extrabold leading-[1.15]">
              Attention !
            </h2>
            <p className="mt-[14px] text-[17px] leading-[1.5] text-[#3f3f46]">
              Tu viens d&apos;étiqueter un dinosaure avec le mauvais régime alimentaire. Observe
              comment cela affectera les résultats de l&apos;algorithme au cours de l&apos;activité.
            </p>
            <div className="mt-[22px] flex justify-end">
              <button
                type="button"
                className="min-h-[40px] rounded-full bg-[#0485f7] px-[18px] text-[15px] font-medium text-white"
                onClick={() => setShowWrongLabelWarning(false)}
              >
                J&apos;ai compris
              </button>
            </div>
          </section>
        </div>
      )}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
        <Image fill alt="" className="absolute max-w-none object-cover" sizes="100vw" src={imgWhiteBox1} />
        <div className="absolute inset-0" style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg viewBox=\\'0 0 1440 1024\\' xmlns=\\'http://www.w3.org/2000/svg\\' preserveAspectRatio=\\'none\\'><rect x=\\'0\\' y=\\'0\\' height=\\'100%\\' width=\\'100%\\' fill=\\'url(%23grad)\\' opacity=\\'0.25\\'/><defs><radialGradient id=\\'grad\\' gradientUnits=\\'userSpaceOnUse\\' cx=\\'0\\' cy=\\'0\\' r=\\'10\\' gradientTransform=\\'matrix(4.4087e-15 51.2 -72 3.1351e-15 720 512)\\'><stop stop-color=\\'rgba(102,102,102,1)\\' offset=\\'0\\'/><stop stop-color=\\'rgba(77,77,77,1)\\' offset=\\'0.25\\'/><stop stop-color=\\'rgba(51,51,51,1)\\' offset=\\'0.5\\'/><stop stop-color=\\'rgba(26,26,26,1)\\' offset=\\'0.75\\'/><stop stop-color=\\'rgba(13,13,13,1)\\' offset=\\'0.875\\'/><stop stop-color=\\'rgba(6,6,6,1)\\' offset=\\'0.9375\\'/><stop stop-color=\\'rgba(0,0,0,1)\\' offset=\\'1\\'/></radialGradient></defs></svg>')" }} />
      </div>
      <div className={contentClassName} data-node-id="10:189">
        <div className={leftPanelClassName} data-name="left" data-node-id="11:6">
          <div className={stackedCardsClassName} data-name="all cards left" data-node-id="10:175" style={{
            backdropFilter: "blur(4.5px)",
            maskImage: "linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 1) 100%)",
            WebkitMaskImage: "linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.3) 40%, rgba(0, 0, 0, 1) 100%)"
          }}>
            {remainingDinos.reverse().map((dino) => (
              <Dino
                key={dino}
                className={stackedDinoClassName}
                dino={dino}
                size="md"
              />
            ))}
            <Dino className={stackedDinoClassName} dino="Number" size="md" digit={dinoCount} />
          </div>
          <div className="flex w-full min-w-[180px] flex-col items-start gap-[4px] flex-[1_0_0] self-stretch">
            <p className="font-medium text-[14px] leading-[1.43] text-[#efefef]">Tes notes:</p>
            {tutorialStep === 2 ? (
              <DataLabellingTutorialTarget
                className="h-full w-full"
                label="2) Prends des notes sur chaque dinosaure"
                onDismiss={onTutorialDismiss}
                placement="top"
              >
                <TextArea
                  className="h-full w-full [&>div]:w-full"
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Écris tes notes ici..."
                  value={notes}
                />
              </DataLabellingTutorialTarget>
            ) : (
              <TextArea
                className="w-full h-full [&>div]:w-full"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Écris tes notes ici..."
                value={notes}
              />
            )}
          </div>
        </div>
        <div className={mainCardClassName} data-name="Main card" data-node-id="10:187">
          {selectedDino ? (
            <Dino className={mainDinoClassName} dino={selectedDino} size="Main" />
          ) : (
            <div className="bg-[#f5f5f5] border border-dashed border-[#dedee0] flex h-full flex-col items-center justify-center gap-[24px] rounded-[20px] text-[24px] text-[#71717a] w-full">
              <p>Tous les dinosaures ont été assignés.</p>
              <Link
                className="inline-flex h-[48px] items-center justify-center rounded-full bg-[#006fee] px-[24px] text-[16px] font-medium text-white transition hover:bg-[#0059c9]"
                href="/feature_selection"
                onClick={() => saveDataLabellingEnd(notes, labels)}
              >
                Suite
              </Link>
            </div>
          )}
        </div>
        <div className={sidePanelClassName} data-name="right" data-node-id="15:5918">
          <DinoBucket className="flex-1 min-h-0" isActive={activeBucket === "herbivore"} data-name="all herbivores" data-node-id="19:12746">
            {renderBucketCards(herbivoreDinos)}
          </DinoBucket>
          {tutorialStep === 3 ? (
            <DataLabellingTutorialTarget
              className="w-full"
              label="3) Classe le dinosaure par régime alimentaire"
              onDismiss={onTutorialDismiss}
              placement="left"
            >
              <DietButton className="text-[clamp(16px,2vw,24px)]" isActive={activeBucket === "herbivore"} isDisabled={!selectedDino} variant="herbivore" onClick={() => assignSelectedDino("herbivore")}>
                Herbivore
              </DietButton>
            </DataLabellingTutorialTarget>
          ) : (
            <DietButton className="text-[clamp(16px,2vw,24px)]" isActive={activeBucket === "herbivore"} isDisabled={!selectedDino} variant="herbivore" onClick={() => assignSelectedDino("herbivore")}>
              Herbivore
            </DietButton>
          )}
          <Separator/>
          <DietButton className="text-[clamp(16px,2vw,24px)]" isActive={activeBucket === "carnivore"} isDisabled={!selectedDino} variant="carnivore" onClick={() => assignSelectedDino("carnivore")}>
            Carnivore
          </DietButton>
          <DinoBucket className="flex-1 min-h-0" isActive={activeBucket === "carnivore"} data-name="all carnivores" data-node-id="19:12750">
            {renderBucketCards(carnivoreDinos)}
          </DinoBucket>
        </div>
      </div>
    </div>
  );
}
