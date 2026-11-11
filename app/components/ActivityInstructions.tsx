"use client";

import { Button } from "@heroui/react";
import { type ReactNode } from "react";
import Image from "next/image";
import { logAction } from "@/app/lib/experimentCollection";

type ActivityInstructionsOverlayProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
  stepImage?: {
    alt: string;
    height: number;
    src: string;
    width: number;
  };
};

type ActivityInstructionsButtonProps = {
  onPress: () => void;
};

export function ActivityInstructionsOverlay({
  title,
  children,
  onClose,
  stepImage,
}: ActivityInstructionsOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-[24px] py-[24px] backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-instructions-title"
        className="flex max-h-full w-full max-w-[800px] flex-col gap-[18px] overflow-auto rounded-[24px] border border-[#dedee0] bg-white p-[28px] text-[#18181b] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_-6px_12px_rgba(0,0,0,0.03),0_14px_28px_rgba(0,0,0,0.08)]"
      >
        <div className="flex flex-col gap-[14px] sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[14px] font-medium text-[#52525b]">Avant de commencer</p>
            <h2 id="activity-instructions-title" className="mt-[6px] text-[28px] font-extrabold leading-[1.12]">
              {title}
            </h2>
          </div>
          {stepImage && (
            <Image
              alt={stepImage.alt}
              className="h-auto w-full max-w-[550px] shrink-0 sm:mt-[4px]"
              height={stepImage.height}
              priority
              src={stepImage.src}
              width={stepImage.width}
            />
          )}
        </div>
        <div className="flex flex-col gap-[12px] text-[16px] leading-[1.5] text-[#3f3f46]">
          {children}
        </div>
        <div className="flex justify-end">
          <Button
            className="min-h-[40px] rounded-full bg-[#0485f7] px-[18px] text-[15px] font-medium text-white"
            onPress={onClose}
          >
            C&apos;est parti !
          </Button>
        </div>
      </section>
    </div>
  );
}

export function ActivityInstructionsButton({ onPress }: ActivityInstructionsButtonProps) {
  return (
    <Button
      className="fixed left-[16px] top-[16px] z-40 min-h-[32px] rounded-full border border-white/50 bg-white/90 px-[12px] text-[13px] font-medium text-[#18181b] shadow-[0_2px_8px_rgba(0,0,0,0.12)] backdrop-blur-[20px] transition hover:bg-white"
      onPress={() => {
        logAction("help_opened");
        onPress();
      }}
    >
      Euh je dois faire quoi déjà ?
    </Button>
  );
}

type ActivityCondition = "WB" | "BB";

export function DataLabellingInstructionsContent({ condition }: { condition: ActivityCondition }) {
  if (condition === "WB") {
    return (
      <>
        <p>
          L&apos;équipe d&apos;archéologues a déjà annoté 5 des 10 fiches de dinosaures : elles sont déjà
          rangées. Il reste 5 fiches. Lis-les attentivement, prends des notes sur les indices qui pourraient
          t&apos;aider à identifier leur régime alimentaire et classe ces 5 dinosaures.
        </p>
        <Image
        alt="Exemples de types de colonnes: numérique, catégorique et booléen"
        className="mt-[4px] h-auto w-full"
        height={621}
        priority
        src="/Hints/TaskClassify.png"
        width={3720}
      />
      </>
    );
  }

  return (
    <>
      <p>
          L&apos;équipe d&apos;archéologues a déjà annoté 5 des 10 fiches de dinosaures : elles sont déjà
          rangées. Il reste 5 fiches. Lis-les attentivement et prends des notes sur les indices qui
          pourraient aider l&apos;algorithme à identifier leur régime alimentaire.
        </p>
        <Image
        alt="Exemples de types de colonnes: numérique, catégorique et booléen"
        className="mt-[4px] h-auto w-full"
        height={621}
        priority
        src="/Hints/TaskClassify.png"
        width={3720}
      />
    </>
  );
}

export function FeatureSelectionInstructionsContent({ condition }: { condition: ActivityCondition }) {
  if (condition === "WB") {
    return (
      <>
        <p>
          Parmi les nombreuses informations que tu as pu récolter, seulement une partie pourra permettre
        de déterminer si un dinosaure est carnivore ou herbivore.
        </p>
        <p>
          Choisis 4 caractéristiques qui te semblent les plus judicieuses pour
          déterminer si un dinosaure est carnivore ou herbivore. 
        </p>
        <Image
        alt="Sélection des caractéristiques"
        className="mt-[4px] h-auto w-full "
        height={621}
        priority
        src="/Hints/TaskFeatures.png"
        width={3720}
      />
      </>
    );
  }

  return (
    <>
      <p>
        Parmi les nombreuses informations que tu as pu récolter, seulement une partie pourra permettre
        de déterminer si un dinosaure est carnivore ou herbivore. En voici une première sélection.
      </p>
      <p>
        Tu dois maintenant indiquer le type de chaque colonne. <br></br>
        Elle est catégorique quand elle décrit une liste de catégories. <br></br>
        Une colonne est numérique quand elle contient des nombres mesurables. <br></br>
        Elle est booléenne quand elle ne peut prendre que deux valeurs: vrai/faux ou oui/non.
      </p>
      <Image
        alt="Exemples de types de colonnes: numérique, catégorique et booléen"
        className="mt-[4px] h-auto w-full "
        height={621}
        priority
        src="/Hints/FeatureTypes_Inline.png"
        width={3720}
      />
    </>
  );
}

export function ModellingInstructionsContent({}: { condition: ActivityCondition }) {
  return (
      <>
        <p>
          Maintenant que tu as fini de préparer tes données, tu vas pouvoir les donner à un algorithme 
          pour qu&apos;il <strong>apprenne à reconnaître</strong> un herbivore ou un carnivore.
        </p>
        <Image
        alt="Entraînement du modèle"
        className="mt-[4px] h-auto w-full "
        height={621}
        priority
        src="/Hints/TaskTraining.png"
        width={3720}
      />
      </>
    );
}

export function EvaluationInstructionsContent() {
  return (
    <>
      <p>
        Dernière étape ! Tu as pu entraîner un modèle à reconnaître le régime alimentaire d&apos;un
        dinosaure. Voyons maintenant comment il performe sur des dinosaures qu&apos;il <strong>n&apos;a encore
        jamais rencontrés.</strong> Sera-t-il aussi performant ?
      </p>
      <Image
        alt="Évaluation du modèle"
        className="mt-[4px] h-auto w-full"
        height={621}
        priority
        src="/Hints/TaskEvaluation.png"
        width={3720}
      />
    </>
  );
}

export function GiniInstructionsContent() {
  return (
    <>
      <p>
        L&apos;algorithme que tu vas entraîner est un <strong>arbre de décision</strong>. 

        Ce type de modèle choisit des questions successives pour séparer les dinosaures en groupes de plus en plus purs: 
        idéalement, un groupe contient <strong>seulement des carnivores</strong> ou <strong>seulement des herbivores</strong>.
        Pour comparer les séparations possibles, on calcule <strong>l&apos;impureté de Gini</strong>.
      </p>
      <Image
        alt="Gini computation example"
        className="mt-[4px] h-auto w-full"
        height={621}
        priority
        src="/Hints/GiniInline.png"
        width={3720}
      />
    </>
  );
}
