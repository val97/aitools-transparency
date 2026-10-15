"use client";

import { type WhiteBoxGiniResult, type WhiteBoxSplitFilter, type WhiteBoxTreeNode } from "./trainingState";
import { loadLabelledTableRows, type LabelledDataFile, type PredictionTableRow, type TrainingTableRow } from "./tableRows";

function isBooleanLikeValue(value: string | number | boolean | undefined) {
  return value === true || value === false || String(value).toLowerCase() === "true" || String(value).toLowerCase() === "false";
}

function normalizeComparableValue(value: string | number | boolean | undefined) {
  return isBooleanLikeValue(value) ? String(value).toLowerCase() : String(value);
}

function valuesAreEqual(firstValue: string | number | boolean | undefined, secondValue: string | number | boolean | undefined) {
  return normalizeComparableValue(firstValue) === normalizeComparableValue(secondValue);
}

export function rowMatchesWhiteBoxSplit(row: TrainingTableRow, split: WhiteBoxGiniResult) {
  const rowValue = row[split.feature];

  if (split.operator === "gte") {
    return Number(rowValue) >= Number(split.value);
  }

  return valuesAreEqual(rowValue, split.value);
}

export function rowMatchesWhiteBoxFilter(row: TrainingTableRow, filter: WhiteBoxSplitFilter) {
  const rowValue = row[filter.feature];
  const matchesCondition =
    filter.operator === "gte"
      ? Number(rowValue) >= Number(filter.value)
      : valuesAreEqual(rowValue, filter.value);

  return filter.branch === "yes" ? matchesCondition : !matchesCondition;
}

// Ids of the nodes a dinosaur visits, from the root down to its leaf.
export function whiteBoxPathForRow(row: TrainingTableRow, nodes: WhiteBoxTreeNode[]) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  let currentNode = nodesById.get("root") ?? nodes[0];
  const path: WhiteBoxTreeNode[] = currentNode ? [currentNode] : [];

  while (currentNode?.selectedSplit && currentNode.leftId && currentNode.rightId) {
    const nextNodeId = rowMatchesWhiteBoxSplit(row, currentNode.selectedSplit)
      ? currentNode.rightId
      : currentNode.leftId;
    const nextNode = nodesById.get(nextNodeId);

    if (!nextNode) {
      break;
    }

    currentNode = nextNode;
    path.push(currentNode);
  }

  return path;
}

export function predictRowWithWhiteBoxTree(row: TrainingTableRow, nodes: WhiteBoxTreeNode[]) {
  const path = whiteBoxPathForRow(row, nodes);

  return path[path.length - 1]?.counts?.majority ?? "herbivore";
}

export async function buildWhiteBoxPredictionRows(nodes: WhiteBoxTreeNode[], dataFile: LabelledDataFile) {
  const table = await loadLabelledTableRows(dataFile);

  return table.rows.map<PredictionTableRow>((row) => ({
    ...row,
    régime_alimentaire_prédit: predictRowWithWhiteBoxTree(row, nodes),
  }));
}


type GiniResponse = {
  counts: WhiteBoxTreeNode["counts"];
  results?: WhiteBoxGiniResult[];
};

async function fetchGini(payload: {
  features: string[];
  filters: WhiteBoxSplitFilter[];
  labels: Record<string, string>;
  dataFile: LabelledDataFile;
}) {
  const response = await fetch("/api/modelling/gini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Impossible d’entraîner le modèle.");
  }

  return (await response.json()) as GiniResponse;
}

// Builds the tree the way the glass-box page does when the algorithm decides
// alone: at each node, take the splittable feature with the lowest Gini
// impurity; stop when the node is pure, has one dinosaur, or no features left.
export async function buildGreedyGiniTree({
  features,
  labels,
  dataFile,
}: {
  features: string[];
  labels: Record<string, string>;
  dataFile: LabelledDataFile;
}) {
  const nodes: WhiteBoxTreeNode[] = [];

  async function visit(node: WhiteBoxTreeNode) {
    nodes.push(node);
    const response = await fetchGini({ features: node.availableFeatures, filters: node.filters, labels, dataFile });
    const counts = node.counts ?? response.counts;

    node.counts = counts;

    if (!counts || counts.isPure || counts.total <= 1 || node.availableFeatures.length === 0) {
      node.isLeaf = true;
      return;
    }

    const results = [...(response.results ?? [])].sort((first, second) => first.gini - second.gini);
    const bestSplit = results.find(
      (split) =>
        split.isSplittable !== false ||
        (node.availableFeatures.length === 1 && split.criterion.length > 0),
    );

    if (!bestSplit) {
      node.isLeaf = true;
      return;
    }

    const nextFeatures = node.availableFeatures.filter((feature) => feature !== bestSplit.feature);
    const child = (branch: "yes" | "no"): WhiteBoxTreeNode => ({
      id: `${node.id}-${branch}`,
      depth: node.depth + 1,
      pathLabels: [],
      filters: [
        ...node.filters,
        { feature: bestSplit.feature, operator: bestSplit.operator, value: bestSplit.value, branch },
      ],
      availableFeatures: nextFeatures,
      counts: branch === "yes" ? bestSplit.yes : bestSplit.no,
    });
    const noNode = child("no");
    const yesNode = child("yes");

    node.selectedSplit = bestSplit;
    node.candidateSplits = results;
    node.leftId = noNode.id;
    node.rightId = yesNode.id;
    await visit(noNode);
    await visit(yesNode);
  }

  await visit({ id: "root", depth: 0, pathLabels: [], filters: [], availableFeatures: features });

  return nodes;
}
