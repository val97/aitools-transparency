"use client";

import Image from "next/image";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityInstructionsOverlay, GiniInstructionsContent } from "@/app/components";
import { dinoPictureSrc } from "@/app/lib/dinoPictures";
import { logAction, type TrainedTreeNode } from "@/app/lib/experimentCollection";
import { type PredictionTableRow, type TrainingTableRow } from "./tableRows";
import { type WhiteBoxGiniResult, type WhiteBoxTreeNode } from "./trainingState";
import { whiteBoxPathForRow } from "./whiteBoxTree";

export type ModelRevealStage = "rules" | "gini";
export type FeatureGuess = {
  features: string[];
  mostImportant: string;
};

// Features the tree really asks about, from the first question down.
function featuresUsedByTree(nodes: WhiteBoxTreeNode[]) {
  return [...nodes]
    .filter((node) => node.selectedSplit && node.leftId && node.rightId)
    .sort((first, second) => first.depth - second.depth)
    .map((node) => node.selectedSplit?.feature ?? "")
    .filter((feature, index, all) => feature && all.indexOf(feature) === index);
}

function StepLabel({ number, children }: { number: number; children: ReactNode }) {
  return (
    <p className="flex items-start gap-[8px] text-[14px] font-semibold leading-[1.4] text-[#18181b]">
      <span className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-[#006fee] text-[12px] text-white">
        {number}
      </span>
      <span>{children}</span>
    </p>
  );
}

// Small labels on a question card, relating it to the student's guess.
export type NodeTag = { label: string; tone: "good" | "bad" | "star" | "hint" | "seen" };

const TAG_TONE_CLASS_NAMES: Record<NodeTag["tone"], string> = {
  good: "bg-[#e8faf0] text-[#0a7f38]",
  bad: "bg-[#fff1f1] text-[#b42318]",
  star: "bg-[#fff6d6] text-[#8a6100]",
  hint: "animate-pulse bg-[#006fee] text-white",
  seen: "bg-[#ebebec] text-[#52525b]",
};

function TagPill({ tag }: { tag: NodeTag }) {
  return (
    <span className={`inline-flex min-h-[24px] items-center rounded-full px-[8px] text-[12px] font-semibold ${TAG_TONE_CLASS_NAMES[tag.tone]}`}>
      {tag.label}
    </span>
  );
}

function isBooleanValue(value: string | number | boolean) {
  return value === true || value === false || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "false";
}

function formatValue(value: string | number | boolean | undefined) {
  if (value === undefined) {
    return "";
  }

  if (isBooleanValue(value)) {
    return String(value).toLowerCase() === "true" ? "vrai" : "faux";
  }

  return String(value);
}

function formatQuestion(split: WhiteBoxGiniResult) {
  if (split.operator === "gte") {
    return `${split.feature} ≥ ${split.value}`;
  }

  return `${split.feature} = ${formatValue(split.value)}`;
}

export function collectionTreeFromWhiteBoxNodes(nodes: WhiteBoxTreeNode[]): TrainedTreeNode | null {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const rootNode = nodesById.get("root") ?? nodes[0];

  if (!rootNode) {
    return null;
  }

  const visitNode = (node: WhiteBoxTreeNode): TrainedTreeNode => {
    const yesNode = node.rightId ? nodesById.get(node.rightId) : undefined;
    const noNode = node.leftId ? nodesById.get(node.leftId) : undefined;

    if (!node.selectedSplit || !yesNode || !noNode) {
      return node.counts?.majority ?? "herbivore";
    }

    return {
      [formatQuestion(node.selectedSplit)]: {
        yes: visitNode(yesNode),
        no: visitNode(noNode),
      },
    };
  };

  return visitNode(rootNode);
}

function NodeCounts({ node }: { node: WhiteBoxTreeNode }) {
  return (
    <div className="flex w-full gap-[6px]">
      <span className="flex min-h-[28px] flex-1 items-center justify-center rounded-full bg-[#ff383c] px-[8px] text-[13px] font-medium text-white">
        Carnivores: {node.counts?.carnivores ?? 0}
      </span>
      <span className="flex min-h-[28px] flex-1 items-center justify-center rounded-full bg-[#17c964] px-[8px] text-[13px] font-medium text-white">
        Herbivores: {node.counts?.herbivores ?? 0}
      </span>
    </div>
  );
}

function GiniList({ node }: { node: WhiteBoxTreeNode }) {
  const candidates = node.candidateSplits ?? (node.selectedSplit ? [node.selectedSplit] : []);

  return (
    <ul className="flex flex-col gap-[4px] rounded-[16px] bg-[#f5f5f5] p-[8px]">
      {candidates.map((split) => {
        const isChosen = split.feature === node.selectedSplit?.feature;

        return (
          <li
            key={split.feature}
            className={`rounded-[12px] px-[10px] py-[6px] text-[14px] leading-[1.4] ${
              isChosen ? "bg-white font-semibold text-[#006fee]" : "text-[#52525b]"
            }`}
          >
            {split.feature}: impureté de Gini = {split.gini.toFixed(2)}
            {isChosen && " ← la plus basse, choisie"}
          </li>
        );
      })}
    </ul>
  );
}

// Same look as the C1 tree (pageWB.tsx): white cards, NON/OUI pills and
// elbow connectors, scaled down to fit the panel without scrolling.
const SURFACE_SHADOW =
  "shadow-[0_2px_8px_rgba(0,0,0,0.06),0_-6px_12px_rgba(0,0,0,0.03),0_14px_28px_rgba(0,0,0,0.08)]";

type ConnectorLine = {
  id: string;
  path: string;
  isHighlighted: boolean;
};

function RevealNode({
  node,
  nodesById,
  highlightedIds,
  dinosaursByLeaf,
  onSelectNode,
  showsCounts,
  nodeTags,
}: {
  node: WhiteBoxTreeNode;
  nodesById: Map<string, WhiteBoxTreeNode>;
  highlightedIds: Set<string>;
  dinosaursByLeaf: Map<string, string[]>;
  onSelectNode?: (nodeId: string) => void;
  showsCounts: boolean;
  nodeTags?: Map<string, NodeTag[]>;
}) {
  const isHighlighted = highlightedIds.has(node.id);
  const noNode = node.leftId ? nodesById.get(node.leftId) : undefined;
  const yesNode = node.rightId ? nodesById.get(node.rightId) : undefined;
  const cardClassName = `relative flex flex-col rounded-[24px] bg-white text-left ${SURFACE_SHADOW} transition ${
    isHighlighted ? "ring-[3px] ring-[#006fee]" : ""
  } ${onSelectNode ? "cursor-pointer hover:ring-[3px] hover:ring-[#006fee]/50" : "cursor-default"}`;
  const branchClassName = (isTaken: boolean) =>
    `flex min-h-[32px] items-center justify-center rounded-full px-[12px] text-[14px] font-medium ${
      isTaken ? "bg-[#006fee] text-white" : "bg-[#ebebec] text-[#18181b]"
    }`;

  if (node.selectedSplit && noNode && yesNode) {
    return (
      <div className="flex flex-col items-center">
        <button
          type="button"
          data-reveal-node={node.id}
          data-tree-node-card={node.id}
          className={`${cardClassName} w-[300px] gap-[14px] p-[20px]`}
          disabled={!onSelectNode}
          onClick={() => onSelectNode?.(node.id)}
        >
          {nodeTags?.get(node.id)?.length ? (
            <span className="flex flex-wrap gap-[6px]">
              {nodeTags.get(node.id)?.map((tag) => <TagPill key={tag.label} tag={tag} />)}
            </span>
          ) : null}
          <span className="text-[16px] font-medium leading-[1.4] text-[#18181b]">
            {formatQuestion(node.selectedSplit)} ?
          </span>
          <span className="grid w-full grid-cols-2 gap-[8px]">
            <span data-tree-branch-button={`${node.id}:no`} className={branchClassName(isHighlighted && highlightedIds.has(noNode.id))}>
              NON
            </span>
            <span data-tree-branch-button={`${node.id}:yes`} className={branchClassName(isHighlighted && highlightedIds.has(yesNode.id))}>
              OUI
            </span>
          </span>
        </button>
        <div className="h-[48px]" aria-hidden="true" />
        <div className="flex items-start justify-center gap-[40px]">
          <RevealNode
            node={noNode}
            nodesById={nodesById}
            highlightedIds={highlightedIds}
            dinosaursByLeaf={dinosaursByLeaf}
            onSelectNode={onSelectNode}
            showsCounts={showsCounts}
            nodeTags={nodeTags}
          />
          <RevealNode
            node={yesNode}
            nodesById={nodesById}
            highlightedIds={highlightedIds}
            dinosaursByLeaf={dinosaursByLeaf}
            onSelectNode={onSelectNode}
            showsCounts={showsCounts}
            nodeTags={nodeTags}
          />
        </div>
      </div>
    );
  }

  const prediction = node.counts?.majority ?? "herbivore";
  const names = dinosaursByLeaf.get(node.id) ?? [];

  return (
    <button
      type="button"
      data-reveal-node={node.id}
      data-tree-node-card={node.id}
      className={`${cardClassName} w-[180px] gap-[10px] p-[18px]`}
      disabled={!onSelectNode}
      onClick={() => onSelectNode?.(node.id)}
    >
      <span className="text-[16px] font-medium leading-[1.4] text-[#18181b]">
        {prediction === "carnivore" ? "Carnivore" : "Herbivore"}
      </span>
      {showsCounts && (
      <span className="flex flex-col gap-[6px]">
        <span className="flex min-h-[28px] items-center justify-center rounded-full bg-[#ff383c] px-[10px] text-[13px] font-medium text-white">
          Carnivores: {node.counts?.carnivores ?? 0}
        </span>
        <span className="flex min-h-[28px] items-center justify-center rounded-full bg-[#17c964] px-[10px] text-[13px] font-medium text-white">
          Herbivores: {node.counts?.herbivores ?? 0}
        </span>
      </span>
      )}
      {names.length > 0 && (
        <ul className="list-disc pl-[18px] text-[13px] leading-[1.4] text-[#71717a]">
          {names.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </button>
  );
}

export function ModelTreeView({
  nodes,
  highlightedIds,
  dinosaursByLeaf,
  onSelectNode,
  showsCounts = true,
  nodeTags,
}: {
  nodes: WhiteBoxTreeNode[];
  highlightedIds: Set<string>;
  dinosaursByLeaf: Map<string, string[]>;
  onSelectNode?: (nodeId: string) => void;
  // The training counts; off in evaluation, where the leaves list new dinosaurs.
  showsCounts?: boolean;
  nodeTags?: Map<string, NodeTag[]>;
}) {
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const rootNode = nodesById.get("root") ?? nodes[0];
  const frameRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);
  const [connectorLines, setConnectorLines] = useState<ConnectorLine[]>([]);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    const content = contentRef.current;

    if (!frame || !content) {
      return;
    }

    let animationFrame: number | null = null;

    const measure = () => {
      const width = content.offsetWidth;
      const height = content.offsetHeight;
      const nextScale = Math.min(1, frame.clientWidth / width, frame.clientHeight / height);
      const contentRect = content.getBoundingClientRect();
      const currentScale = contentRect.width / width || 1;
      const nextLines: ConnectorLine[] = [];

      nodes.forEach((node) => {
        const connections = [
          { branch: "no", childId: node.leftId },
          { branch: "yes", childId: node.rightId },
        ] as const;

        connections.forEach(({ branch, childId }) => {
          if (!childId) {
            return;
          }

          const branchButton = content.querySelector<HTMLElement>(`[data-tree-branch-button="${node.id}:${branch}"]`);
          const childCard = content.querySelector<HTMLElement>(`[data-tree-node-card="${childId}"]`);

          if (!branchButton || !childCard) {
            return;
          }

          const buttonRect = branchButton.getBoundingClientRect();
          const childRect = childCard.getBoundingClientRect();
          const startX = (buttonRect.left + buttonRect.width / 2 - contentRect.left) / currentScale;
          const startY = (buttonRect.bottom - contentRect.top) / currentScale;
          const endX = (childRect.left + childRect.width / 2 - contentRect.left) / currentScale;
          const endY = (childRect.top - contentRect.top) / currentScale;
          const midpointY = startY + (endY - startY) / 2;

          nextLines.push({
            id: `${node.id}-${branch}`,
            path: `M ${startX} ${startY} V ${midpointY} H ${endX} V ${endY}`,
            isHighlighted: highlightedIds.has(node.id) && highlightedIds.has(childId),
          });
        });
      });

      setScale(nextScale);
      setConnectorLines(nextLines);
    };

    const scheduleMeasure = () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(frame);
    resizeObserver.observe(content);

    return () => {
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
      }

      resizeObserver.disconnect();
    };
  }, [nodes, highlightedIds, dinosaursByLeaf, nodeTags]);

  return (
    <div ref={frameRef} className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
      {rootNode && (
        <div
          ref={contentRef}
          className="absolute left-1/2 top-0 w-max p-[12px]"
          style={{ transform: `translateX(-50%) scale(${scale})`, transformOrigin: "top center" }}
        >
          <svg aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
            {[...connectorLines]
              .sort((a, b) => Number(a.isHighlighted) - Number(b.isHighlighted))
              .map((line) => (
                <path
                  key={line.id}
                  d={line.path}
                  fill="none"
                  stroke={line.isHighlighted ? "#006fee" : "#dedee0"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                />
              ))}
          </svg>
          <div className="relative">
            <RevealNode
              node={rootNode}
              nodesById={nodesById}
              highlightedIds={highlightedIds}
              dinosaursByLeaf={dinosaursByLeaf}
              onSelectNode={onSelectNode}
              showsCounts={showsCounts}
              nodeTags={nodeTags}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Rules page, step 1: the student's guess next to what the tree really uses,
// feature by feature, then their "most important" pick against the tree's
// first question. The same verdicts are tagged on the tree's question cards.
function GuessComparison({
  features,
  usedFeatures,
  mostImportantFeature,
  studentGuess,
}: {
  features: string[];
  usedFeatures: string[];
  mostImportantFeature: string;
  studentGuess: FeatureGuess;
}) {
  const matches = features.filter(
    (feature) => studentGuess.features.includes(feature) === usedFeatures.includes(feature),
  ).length;
  const hasRightMostImportant = studentGuess.mostImportant === mostImportantFeature;

  return (
    <aside className="flex w-[290px] shrink-0 flex-col gap-[10px] overflow-auto rounded-[20px] bg-white p-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_14px_28px_rgba(0,0,0,0.08)]">
      <StepLabel number={1}>Compare avec ta devinette</StepLabel>
      <table className="w-full border-collapse text-left text-[13px] text-[#18181b]">
        <thead>
          <tr className="text-[#52525b]">
            <th className="px-[6px] py-[4px] font-medium">caractéristique</th>
            <th className="px-[6px] py-[4px] text-center font-medium">toi</th>
            <th className="px-[6px] py-[4px] text-center font-medium">l&apos;arbre</th>
          </tr>
        </thead>
        <tbody>
          {features.map((feature) => {
            const isGuessed = studentGuess.features.includes(feature);
            const isUsed = usedFeatures.includes(feature);

            return (
              <tr
                key={feature}
                className={`border-b border-white ${isGuessed === isUsed ? "bg-[#ecfdf3]" : "bg-[#fef0f0]"}`}
              >
                <td className="px-[6px] py-[3px] font-medium">{feature}</td>
                <td className="px-[6px] py-[3px] text-center">{isGuessed ? "cochée" : "—"}</td>
                <td className="px-[6px] py-[3px] text-center">{isUsed ? "utilisée" : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[12px] leading-[1.4] text-[#52525b]">
        {`${matches} sur ${features.length} bien devinées. Vert: comme l'arbre. Rouge: différent.`}
      </p>

      <div className="flex flex-col gap-[6px] rounded-[16px] bg-[#fffbeb] p-[10px]">
        <p className="text-[14px] font-semibold text-[#8a6100]">★ La plus importante</p>
        <div className="grid grid-cols-[auto_1fr] gap-x-[8px] gap-y-[2px] text-[13px] leading-[1.4] text-[#18181b]">
          <span className="text-[#52525b]">Toi:</span>
          <strong className="text-[#18181b]">{studentGuess.mostImportant || "—"}</strong>
          <span className="text-[#52525b]">L&apos;arbre:</span>
          <strong className="text-[#18181b]">{mostImportantFeature}</strong>
        </div>
        <p
          className={`rounded-[10px] px-[10px] py-[4px] text-[13px] font-semibold ${
            hasRightMostImportant ? "bg-[#e8faf0] text-[#0a7f38]" : "bg-[#fff1f1] text-[#b42318]"
          }`}
        >
          {hasRightMostImportant ? "✓ Bien vu !" : "✗ Pas tout à fait"}
        </p>
        <p className="text-[12px] leading-[1.4] text-[#52525b]">
          C&apos;est la première question de l&apos;arbre (★): tous les dinosaures y passent, et c&apos;est
          elle qui sépare le mieux les carnivores des herbivores.
        </p>
      </div>
    </aside>
  );
}

// Rules page, step 2 (right column): every training dinosaur as a picture
// card; picking one lights up its path in the tree. A hint pulses until a second one is tried.
function DinoPicker({
  rows,
  features,
  selectedIndex,
  prediction,
  showsHint,
  onPick,
}: {
  rows: PredictionTableRow[];
  features: string[];
  selectedIndex: number;
  prediction?: string;
  showsHint: boolean;
  onPick: (index: number) => void;
}) {
  const selectedRow = rows[selectedIndex];

  return (
    <aside className="flex w-[230px] shrink-0 flex-col gap-[8px] overflow-auto rounded-[20px] bg-white p-[12px] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_14px_28px_rgba(0,0,0,0.08)]">
      <StepLabel number={2}>Clique sur un dinosaure: son chemin s&apos;allume en bleu.</StepLabel>
      {showsHint && (
        <span className="animate-pulse self-start rounded-full bg-[#006fee] px-[10px] py-[2px] text-[12px] font-semibold text-white">
          Essaie-en plusieurs !
        </span>
      )}
      <div className="grid grid-cols-2 gap-[6px]">
        {rows.map((row, index) => {
          const name = String(row.nom ?? "");
          const picture = dinoPictureSrc(name);
          const isSelected = index === selectedIndex;

          return (
            <button
              key={name || index}
              type="button"
              aria-pressed={isSelected}
              className={`flex flex-col items-center rounded-[12px] border-2 px-[2px] py-[3px] transition ${
                isSelected
                  ? "border-[#006fee] bg-[#eaf3ff]"
                  : "border-[#ebebec] bg-white hover:border-[#006fee]/50 hover:shadow-md"
              }`}
              onClick={() => onPick(index)}
            >
              {picture && <Image alt="" className="h-[30px] w-[56px] object-contain" height={30} src={picture} width={56} />}
              <span className={`max-w-full truncate text-[11px] font-medium ${isSelected ? "text-[#006fee]" : "text-[#18181b]"}`}>
                {name}
              </span>
            </button>
          );
        })}
      </div>
      {selectedRow && (
        <div className="flex flex-col gap-[2px] rounded-[12px] bg-[#f5f5f5] px-[8px] py-[6px] text-[11px] leading-[1.35] text-[#18181b]">
          {prediction && (
            <span className="text-[12px]">
              {String(selectedRow.nom ?? "")} → l&apos;arbre prédit{" "}
              <strong className={prediction === "carnivore" ? "text-[#ff383c]" : "text-[#0a7f38]"}>
                {prediction === "carnivore" ? "Carnivore" : "Herbivore"}
              </strong>
            </span>
          )}
          {features.map((feature) => (
            <span key={feature} className="text-[#52525b]">
              {feature}: <strong className="text-[#18181b]">{formatValue(selectedRow[feature])}</strong>
            </span>
          ))}
        </div>
      )}
    </aside>
  );
}

const PANEL_CLASS_NAME = "flex w-[340px] shrink-0 flex-col gap-[14px] rounded-[20px] bg-white p-[20px] shadow-[0_2px_8px_rgba(0,0,0,0.06),0_14px_28px_rgba(0,0,0,0.08)]";

// C5, pages 2 and 3 of the model phase. "rules": the tree's questions and
// each training dinosaur's path, next to what the student guessed. "gini":
// opens with the Gini explanation, then the same tree, where clicking a
// question shows the Gini impurity that made the algorithm pick it.
export function ModelReveal({
  nodes,
  rows,
  features,
  stage,
  studentGuess,
  onOtherQuestionOpened,
}: {
  nodes: WhiteBoxTreeNode[];
  rows: PredictionTableRow[];
  features: string[];
  stage: ModelRevealStage;
  studentGuess: FeatureGuess;
  // Gini page: called once a question other than the first one is opened.
  onOtherQuestionOpened?: () => void;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [hasPickedDino, setHasPickedDino] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState("root");
  const [seenQuestionIds, setSeenQuestionIds] = useState<Set<string>>(() => new Set(["root"]));
  const [isGiniHelpOpen, setIsGiniHelpOpen] = useState(stage === "gini");
  const nodesById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const rootNode = nodesById.get("root") ?? nodes[0];
  const paths = useMemo(
    () => rows.map((row) => whiteBoxPathForRow(row as TrainingTableRow, nodes)),
    [nodes, rows],
  );
  const dinosaursByLeaf = useMemo(() => {
    const byLeaf = new Map<string, string[]>();

    paths.forEach((path, index) => {
      const leaf = path[path.length - 1];

      if (leaf) {
        byLeaf.set(leaf.id, [...(byLeaf.get(leaf.id) ?? []), String(rows[index]?.nom ?? "")]);
      }
    });

    return byLeaf;
  }, [paths, rows]);
  const selectedNode = nodesById.get(selectedNodeId) ?? rootNode;
  const highlightedIds = useMemo(
    () =>
      stage === "rules"
        ? new Set((paths[selectedIndex] ?? []).map((node) => node.id))
        : new Set(selectedNode ? [selectedNode.id] : []),
    [paths, selectedIndex, selectedNode, stage],
  );

  const usedFeatures = useMemo(() => featuresUsedByTree(nodes), [nodes]);
  const nodeTags = useMemo(() => {
    const tags = new Map<string, NodeTag[]>();

    // Gini page: questions not opened yet pulse "Clique-moi".
    if (stage === "gini") {
      nodes.forEach((node) => {
        if (node.selectedSplit && node.leftId && node.rightId) {
          tags.set(node.id, [
            seenQuestionIds.has(node.id)
              ? { label: "✓ vue", tone: "seen" }
              : { label: "👆 Clique-moi", tone: "hint" },
          ]);
        }
      });

      return tags;
    }

    nodes.forEach((node) => {
      const feature = node.selectedSplit?.feature;

      if (!feature || !node.leftId || !node.rightId) {
        return;
      }

      tags.set(node.id, [
        ...(node.id === rootNode?.id ? [{ label: "★ la plus importante", tone: "star" as const }] : []),
        studentGuess.features.includes(feature)
          ? { label: "✓ tu l'avais cochée", tone: "good" as const }
          : { label: "✗ tu ne l'avais pas cochée", tone: "bad" as const },
      ]);
    });

    return tags;
  }, [nodes, rootNode, seenQuestionIds, stage, studentGuess.features]);
  const questionCount = nodes.filter((node) => node.selectedSplit && node.leftId && node.rightId).length;
  const selectNode = (nodeId: string) => {
    const node = nodesById.get(nodeId);

    setSelectedNodeId(nodeId);

    if (node?.selectedSplit && node.leftId && node.rightId) {
      logAction(`gini_question:${node.selectedSplit.feature}`);
      setSeenQuestionIds((current) => new Set(current).add(nodeId));

      if (nodeId !== rootNode?.id) {
        onOtherQuestionOpened?.();
      }
    }
  };

  if (!rootNode) {
    return null;
  }

  const tree = (
    <ModelTreeView
      nodes={nodes}
      highlightedIds={highlightedIds}
      dinosaursByLeaf={dinosaursByLeaf}
      onSelectNode={stage === "gini" ? selectNode : undefined}
      nodeTags={nodeTags}
    />
  );

  if (stage === "rules") {
    const pickDino = (index: number) => {
      if (index !== selectedIndex) {
        setHasPickedDino(true);
        logAction(`tree_dino:${String(rows[index]?.nom ?? "")}`);
      }

      setSelectedIndex(index);
    };

    return (
      <div className="flex min-h-0 w-full flex-1 gap-[20px]">
        <GuessComparison
          features={features}
          usedFeatures={usedFeatures}
          mostImportantFeature={rootNode.selectedSplit?.feature ?? ""}
          studentGuess={studentGuess}
        />
        {tree}
        <DinoPicker
          rows={rows}
          features={features}
          selectedIndex={selectedIndex}
          prediction={paths[selectedIndex]?.at(-1)?.counts?.majority}
          showsHint={!hasPickedDino}
          onPick={pickDino}
        />
      </div>
    );
  }

  const hasQuestion = Boolean(selectedNode?.selectedSplit && selectedNode.leftId && selectedNode.rightId);

  return (
    <div className="flex min-h-0 w-full flex-1 gap-[20px]">
      {tree}
      <aside className={`${PANEL_CLASS_NAME} overflow-auto`}>
        <StepLabel number={1}>Clique sur les questions de l&apos;arbre (👆) pour voir les calculs.</StepLabel>
        <p className="text-[13px] font-medium text-[#52525b]">
          Questions regardées: {seenQuestionIds.size}/{questionCount}
        </p>
        {selectedNode && (
          <>
            <p className="rounded-[12px] bg-[#f5f5f5] px-[12px] py-[8px] text-[16px] font-semibold leading-[1.4] text-[#18181b]">
              {hasQuestion && selectedNode.selectedSplit
                ? `${formatQuestion(selectedNode.selectedSplit)} ?`
                : `Feuille: ${selectedNode.counts?.majority === "carnivore" ? "Carnivore" : "Herbivore"}`}
            </p>
            <div className="flex flex-col gap-[6px]">
              <StepLabel number={2}>Les dinosaures arrivés à cet endroit:</StepLabel>
              <NodeCounts node={selectedNode} />
            </div>
            {hasQuestion && selectedNode.selectedSplit ? (
              <div className="flex flex-col gap-[6px]">
                <StepLabel number={3}>L&apos;algorithme a essayé chaque question et calculé son impureté de Gini:</StepLabel>
                <GiniList node={selectedNode} />
                <p className="text-[13px] leading-[1.4] text-[#52525b]">
                  Plus le nombre est petit, mieux la question sépare les carnivores des herbivores. Il a donc
                  choisi «&nbsp;{selectedNode.selectedSplit.feature}&nbsp;».
                </p>
              </div>
            ) : (
              <p className="text-[14px] leading-[1.4] text-[#52525b]">
                {selectedNode.counts?.isPure
                  ? "Tous les dinosaures ici ont le même régime: l'algorithme s'arrête et donne cette prédiction."
                  : "Plus aucune question ne peut séparer ces dinosaures: l'algorithme s'arrête et prédit le régime le plus fréquent."}
              </p>
            )}
          </>
        )}
        <button
          type="button"
          className="mt-auto min-h-[36px] rounded-full border border-[#dedee0] bg-white px-[14px] text-[14px] font-medium text-[#18181b] hover:bg-[#f5f5f5]"
          onClick={() => setIsGiniHelpOpen(true)}
        >
          Qu&apos;est-ce que l&apos;impureté de Gini ?
        </button>
      </aside>

      {isGiniHelpOpen && (
        <ActivityInstructionsOverlay title="Comment l'algorithme choisit ses questions" onClose={() => setIsGiniHelpOpen(false)}>
          <GiniInstructionsContent />
        </ActivityInstructionsOverlay>
      )}
    </div>
  );
}
