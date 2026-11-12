"use client";

import { readDinoLabels } from "@/app/lib/dinoLabels";
import { type ModelDataFile } from "./modelConfig";

export type TableCellValue = string | number | boolean | undefined;
// The dinosaurs shown in Run 1 (see app/run1/Run1Activity.tsx).
export type Run1DataFile = "run1/df_test.csv";
export type LabelledDataFile = ModelDataFile | "df_test.csv" | Run1DataFile;
export type TrainingTableRow = Record<string, string>;
export type PredictionTableRow = {
  régime_alimentaire_prédit?: string;
} & Record<string, TableCellValue>;

const LABEL_COLUMN = "régime_alimentaire";
const PREDICTION_COLUMN = "régime_alimentaire_prédit";
const labelledTrainingRowsCache = new Map<
  string,
  {
    headers: string[];
    rows: TrainingTableRow[];
    changedCells: Set<string>;
  }
>();
const inFlightLabelledTrainingRows = new Map<
  string,
  Promise<{
    headers: string[];
    rows: TrainingTableRow[];
    changedCells: Set<string>;
  }>
>();

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = "";
  let isInsideQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && isInsideQuotes && nextCharacter === '"') {
      currentValue += character;
      index += 1;
      continue;
    }

    if (character === '"') {
      isInsideQuotes = !isInsideQuotes;
      continue;
    }

    if (character === "," && !isInsideQuotes) {
      values.push(currentValue);
      currentValue = "";
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue);
  return values;
}

function parseCsv(csvText: string) {
  const lines = csvText.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);

    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });

  return { headers, rows };
}

export function compareCellValues(firstValue: TableCellValue, secondValue: TableCellValue) {
  const firstText = String(firstValue ?? "");
  const secondText = String(secondValue ?? "");
  const firstNumber = Number(firstText);
  const secondNumber = Number(secondText);
  const canCompareAsNumbers = firstText.trim() !== "" && secondText.trim() !== "" && !Number.isNaN(firstNumber) && !Number.isNaN(secondNumber);

  if (canCompareAsNumbers) {
    return firstNumber - secondNumber;
  }

  return firstText.localeCompare(secondText, "fr", {
    numeric: true,
    sensitivity: "base",
  });
}

export async function loadLabelledTrainingRows(dataFile: ModelDataFile) {
  return loadLabelledTableRows(dataFile);
}

export async function loadLabelledTableRows(dataFile: LabelledDataFile) {
  const userLabels = readDinoLabels();
  const cacheKey = JSON.stringify({ dataFile, userLabels });
  const cachedTable = labelledTrainingRowsCache.get(cacheKey);

  if (cachedTable) {
    return cachedTable;
  }

  const inFlightTable = inFlightLabelledTrainingRows.get(cacheKey);

  if (inFlightTable) {
    return inFlightTable;
  }

  const tableRequest = loadLabelledRowsFromCsv(dataFile, userLabels).finally(() => {
    inFlightLabelledTrainingRows.delete(cacheKey);
  });

  inFlightLabelledTrainingRows.set(cacheKey, tableRequest);
  const table = await tableRequest;

  labelledTrainingRowsCache.set(cacheKey, table);
  return table;
}

// The CSV as it is on disk, without the labels saved by the students.
export async function loadCsvTable(dataFile: LabelledDataFile) {
  const response = await fetch(`/data/${dataFile}`);

  if (!response.ok) {
    throw new Error(`Impossible de charger ${dataFile}.`);
  }

  return parseCsv(await response.text());
}

export function countDietRows(rows: TrainingTableRow[]) {
  return rows.reduce(
    (counts, row) => {
      if (row[LABEL_COLUMN] === "carnivore") {
        return { ...counts, carnivores: counts.carnivores + 1 };
      }

      if (row[LABEL_COLUMN] === "herbivore") {
        return { ...counts, herbivores: counts.herbivores + 1 };
      }

      return counts;
    },
    { carnivores: 0, herbivores: 0 },
  );
}

export function computeTrainingAccuracy(rows: PredictionTableRow[]) {
  const classifiedRows = rows.filter(
    (row) => row[LABEL_COLUMN] === "carnivore" || row[LABEL_COLUMN] === "herbivore",
  );

  if (classifiedRows.length === 0) {
    return undefined;
  }

  const correctPredictions = classifiedRows.filter(
    (row) => row[LABEL_COLUMN] === row[PREDICTION_COLUMN],
  ).length;

  return correctPredictions / classifiedRows.length;
}

async function loadLabelledRowsFromCsv(dataFile: LabelledDataFile, userLabels: ReturnType<typeof readDinoLabels>) {
  const response = await fetch(`/data/${dataFile}`);

  if (!response.ok) {
    throw new Error(`Impossible de charger ${dataFile}.`);
  }

  const csvText = await response.text();
  const parsedTable = parseCsv(csvText);
  const changedCells = new Set<string>();
  const rows = parsedTable.rows.map((row) => {
    const userDiet = userLabels[row.nom];

    if (!userDiet) {
      return { ...row };
    }

    if (userDiet !== row[LABEL_COLUMN]) {
      changedCells.add(`${row.nom}:${LABEL_COLUMN}`);
    }

    return {
      ...row,
      [LABEL_COLUMN]: userDiet,
    };
  });

  return {
    headers: parsedTable.headers,
    rows,
    changedCells,
  };
}
