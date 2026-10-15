"use client";

import Image from "next/image";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityInstructionsOverlay, GiniInstructionsContent } from "@/app/components";
import { dinoPictureSrc } from "@/app/lib/dinoPictures";
import { type TrainedTreeNode } from "@/app/lib/experimentCollection";
import { type PredictionTableRow, type TrainingTableRow } from "./tableRows";
import { type WhiteBoxGiniResult, type WhiteBoxTreeNode } from "./trainingState";
import { whiteBoxPathForRow } from "./whiteBoxTree";

export type ModelRevealStage = "rules" | "gini";
export type FeatureGuess = {
  features: string[];
  mostImportant: string;
  reason: string;
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

function FeatureChip({ feature, mark }: { feature: string; mark?: string }) {
  return (
    <span className="inline-flex min-h-[28px] items-center gap-[4px] rounded-full bg-[#ebebec] px-[10px] text-[13px] font-medium text-[#18181b]">
      {feature}
      {mark && <span>{mark}</span>}
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
}: {
  node: WhiteBoxTreeNode;
  nodesById: Map<string, WhiteBoxTreeNode>;
  highlightedIds: Set<string>;
  dinosaursByLeaf: Map<string, string[]>;
  onSelectNode?: (nodeId: string) => void;
  showsCounts: boolean;
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
          />
          <RevealNode
            node={yesNode}
            nodesById={nodesById}
            highlightedIds={highlightedIds}
            dinosaursByLeaf={dinosaursByLeaf}
            onSelectNode={onSelectNode}
            showsCounts={showsCounts}
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
}: {
  nodes: WhiteBoxTreeNode[];
  highlightedIds: Set<string>;
  dinosaursByLeaf: Map<string, string[]>;
  onSelectNode?: (nodeId: string) => void;
  // The training counts; off in evaluation, where the leaves list new dinosaurs.
  showsCounts?: boolean;
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
  }, [nodes, highlightedIds, dinosaursByLeaf]);

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
            />
          </div>
        </div>
      )}
    </div>
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
}: {
  nodes: WhiteBoxTreeNode[];
  rows: PredictionTableRow[];
  features: string[];
  stage: ModelRevealStage;
  studentGuess: FeatureGuess;
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState("root");
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
  const selectedRow = rows[selectedIndex];
  const selectedNode = nodesById.get(selectedNodeId) ?? rootNode;
  const highlightedIds = useMemo(
    () =>
      stage === "rules"
        ? new Set((paths[selectedIndex] ?? []).map((node) => node.id))
        : new Set(selectedNode ? [selectedNode.id] : []),
    [paths, selectedIndex, selectedNode, stage],
  );

  if (!rootNode) {
    return null;
  }

  const tree = (
    <ModelTreeView
      nodes={nodes}
      highlightedIds={highlightedIds}
      dinosaursByLeaf={dinosaursByLeaf}
      onSelectNode={stage === "gini" ? setSelectedNodeId : undefined}
    />
  );

  if (stage === "rules") {
    const usedFeatures = featuresUsedByTree(nodes);
    const unusedFeatures = features.filter((feature) => !usedFeatures.includes(feature));

    return (
      <div className="flex min-h-0 w-full flex-1 gap-[20px]">
        <aside className={`${PANEL_CLASS_NAME} overflow-auto`}>
          <div className="flex flex-col gap-[8px]">
            <StepLabel number={1}>Tu avais deviné que le modèle utilise:</StepLabel>
            <div className="flex flex-wrap gap-[6px]">
              {studentGuess.features.map((feature) => (
                <FeatureChip
                  key={feature}
                  feature={feature}
                  mark={feature === studentGuess.mostImportant ? "★ la plus importante" : undefined}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-[8px]">
            <StepLabel number={2}>En vrai, l&apos;arbre pose des questions sur:</StepLabel>
            <div className="flex flex-wrap gap-[6px]">
              {usedFeatures.map((feature, index) => (
                <FeatureChip
                  key={feature}
                  feature={`${index + 1}. ${feature}`}
                  mark={studentGuess.features.includes(feature) ? "✓ deviné" : "✗ pas deviné"}
                />
              ))}
            </div>
            {unusedFeatures.length > 0 && (
              <p className="text-[13px] leading-[1.4] text-[#52525b]">
                Jamais utilisé: {unusedFeatures.join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-[8px]">
            <StepLabel number={3}>Clique sur un dinosaure et suis son chemin dans l&apos;arbre:</StepLabel>
            <div className="flex flex-wrap gap-[6px]">
              {rows.map((row, index) => (
                <button
                  key={String(row.nom ?? index)}
                  type="button"
                  className={`min-h-[28px] rounded-full px-[10px] text-[13px] font-medium ${
                    index === selectedIndex ? "bg-[#006fee] text-white" : "bg-[#ebebec] text-[#18181b] hover:bg-[#dedee0]"
                  }`}
                  onClick={() => setSelectedIndex(index)}
                >
                  {String(row.nom ?? "")}
                </button>
              ))}
            </div>
            {selectedRow && (
              <div className="flex items-center gap-[10px]">
                {dinoPictureSrc(String(selectedRow.nom ?? "")) && (
                  <Image
                    alt={String(selectedRow.nom ?? "")}
                    className="h-[70px] w-[100px] shrink-0 object-contain"
                    height={70}
                    src={dinoPictureSrc(String(selectedRow.nom ?? "")) ?? ""}
                    width={100}
                  />
                )}
                <div className="flex flex-wrap gap-[4px] text-[12px] text-[#18181b]">
                  {features.map((feature) => (
                    <span key={feature} className="inline-flex min-h-[22px] items-center rounded-full bg-[#f5f5f5] px-[8px] font-medium">
                      {feature}: {formatValue(selectedRow[feature])}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>
        {tree}
      </div>
    );
  }

  const hasQuestion = Boolean(selectedNode?.selectedSplit && selectedNode.leftId && selectedNode.rightId);

  return (
    <div className="flex min-h-0 w-full flex-1 gap-[20px]">
      {tree}
      <aside className={`${PANEL_CLASS_NAME} overflow-auto`}>
        <StepLabel number={1}>Clique sur une question de l&apos;arbre.</StepLabel>
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
