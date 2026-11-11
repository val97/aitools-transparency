// Minutes spent on each screen, per group, from the TimeLog saved in
// data/experiment-collections/. Finds where groups get stuck.
//
//   npm run timings                    participant groups only
//   npm run timings -- --include-dev   also the "Tester une condition" runs
//   npm run timings -- --csv out.csv   also write one row per group
//
// A screen's time runs until the next screen. A group that never reached the
// end shows where it stopped; the screen it stopped on has no time.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const COLLECTION_DIR = path.join(process.cwd(), "data", "experiment-collections");
const SCREEN_ORDER = [
  "mission",
  "data_labelling",
  "feature_selection",
  "data_preparation",
  "model_training",
  "model_guess",
  "model_tree",
  "model_gini",
  "evaluation",
  "eval_cards",
  "eval_accuracy",
];
// A screen is flagged when it takes this much longer than its median, and at
// least SLOW_MIN_MINUTES.
const SLOW_FACTOR = 1.5;
const SLOW_MIN_MINUTES = 1;

const args = process.argv.slice(2);
const includeDev = args.includes("--include-dev");
const csvIndex = args.indexOf("--csv");
const csvPath = csvIndex === -1 ? null : args[csvIndex + 1];

function minutesBetween(start, end) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

function median(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summarize(collection, fileName) {
  const log = Array.isArray(collection.TimeLog) ? collection.TimeLog : [];
  const screens = log.filter((entry) => entry.type === "screen");
  const actions = log.filter((entry) => entry.type === "action");
  const minutes = {};

  screens.forEach((entry, index) => {
    const next = screens[index + 1];

    if (next && entry.name !== "end") {
      minutes[entry.name] = (minutes[entry.name] ?? 0) + minutesBetween(entry.at, next.at);
    }
  });

  const last = screens.at(-1);

  return {
    fileName,
    condition: collection.Condition ?? "?",
    group: collection.GroupNb ?? "?",
    keys: (collection.UserIDs ?? []).join(" "),
    start: screens[0]?.at ?? collection.StartTime ?? "",
    status: last?.name === "end" ? "fini" : `arrêté: ${last?.name ?? "?"}`,
    total: screens.length > 1 ? minutesBetween(screens[0].at, last.at) : null,
    minutes,
    helpOpened: actions.filter((entry) => entry.name === "help_opened").length,
    accuracyChecks: actions.filter((entry) => entry.name.startsWith("accuracy_check")).length,
    giniQuestions: actions.filter((entry) => entry.name.startsWith("gini_question")).length,
    treeDinos: actions.filter((entry) => entry.name.startsWith("tree_dino")).length,
  };
}

function readSessions() {
  let fileNames = [];

  try {
    fileNames = readdirSync(COLLECTION_DIR).filter((fileName) => fileName.endsWith(".json"));
  } catch {
    console.error(`Dossier introuvable: ${COLLECTION_DIR}`);
    process.exit(1);
  }

  const sessions = [];
  let withoutLog = 0;

  fileNames.forEach((fileName) => {
    const collection = JSON.parse(readFileSync(path.join(COLLECTION_DIR, fileName), "utf8"));

    if (!includeDev && collection.GroupNb === 0) {
      return;
    }

    if (!Array.isArray(collection.TimeLog) || collection.TimeLog.length === 0) {
      withoutLog += 1;
      return;
    }

    sessions.push(summarize(collection, fileName));
  });

  sessions.sort((a, b) => a.condition.localeCompare(b.condition) || a.start.localeCompare(b.start));

  return { sessions, withoutLog };
}

function formatMinutes(value) {
  return value === null || value === undefined ? "" : value.toFixed(1);
}

function printTable(headers, rows) {
  const widths = headers.map((header, column) =>
    Math.max(header.length, ...rows.map((row) => String(row[column]).length)),
  );
  const line = (cells) => cells.map((cell, column) => String(cell).padEnd(widths[column])).join("  ");

  console.log(line(headers));
  console.log(widths.map((width) => "-".repeat(width)).join("  "));
  rows.forEach((row) => console.log(line(row)));
}

const { sessions, withoutLog } = readSessions();

if (sessions.length === 0) {
  console.log("Aucune session avec un TimeLog.");
  process.exit(0);
}

const screens = SCREEN_ORDER.filter((screen) => sessions.some((session) => screen in session.minutes));
const medians = Object.fromEntries(
  screens.map((screen) => [
    screen,
    median(sessions.map((session) => session.minutes[screen]).filter((value) => value !== undefined)),
  ]),
);
const isSlow = (screen, value) =>
  value !== undefined && value >= SLOW_MIN_MINUTES && value > SLOW_FACTOR * (medians[screen] ?? Infinity);

console.log(`\nMinutes par écran (! = plus de ${SLOW_FACTOR}× la médiane)\n`);
printTable(
  ["cond", "groupe", "statut", ...screens, "total", "aide", "vérif", "gini", "dinos"],
  sessions.map((session) => [
    session.condition,
    session.group,
    session.status,
    ...screens.map((screen) => {
      const value = session.minutes[screen];

      return `${formatMinutes(value)}${isSlow(screen, value) ? "!" : ""}`;
    }),
    formatMinutes(session.total),
    session.helpOpened,
    session.accuracyChecks,
    session.giniQuestions,
    session.treeDinos,
  ]),
);

console.log("\nMédiane par condition\n");
const conditions = [...new Set(sessions.map((session) => session.condition))];
printTable(
  ["cond", "n", ...screens, "total"],
  [...conditions, "tous"].map((condition) => {
    const group = sessions.filter((session) => condition === "tous" || session.condition === condition);
    const valuesFor = (pick) => group.map(pick).filter((value) => value !== undefined && value !== null);

    return [
      condition,
      group.length,
      ...screens.map((screen) => formatMinutes(median(valuesFor((session) => session.minutes[screen])))),
      formatMinutes(median(valuesFor((session) => (session.status === "fini" ? session.total : null)))),
    ];
  }),
);
console.log(
  "\naide = clics sur « Euh je dois faire quoi déjà ? », vérif = clics sur « Vérifier mes réponses »," +
    "\ngini = questions ouvertes (page 3/3), dinos = dinosaures essayés (page 2/3). Total médian: groupes finis seulement.",
);

if (withoutLog > 0) {
  console.log(`\n${withoutLog} session(s) sans TimeLog ignorée(s) (enregistrées avant cette version).`);
}

if (csvPath) {
  const csvHeaders = [
    "condition", "groupe", "cles", "debut", "statut", ...screens, "total", "aide", "verif", "gini", "dinos", "fichier",
  ];
  const escape = (value) => (/[",\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value));
  const csvRows = sessions.map((session) => [
    session.condition,
    session.group,
    session.keys,
    session.start,
    session.status,
    ...screens.map((screen) => formatMinutes(session.minutes[screen])),
    formatMinutes(session.total),
    session.helpOpened,
    session.accuracyChecks,
    session.giniQuestions,
    session.treeDinos,
    session.fileName,
  ]);

  writeFileSync(csvPath, [csvHeaders, ...csvRows].map((row) => row.map(escape).join(",")).join("\n") + "\n");
  console.log(`\nCSV écrit: ${csvPath}`);
}
