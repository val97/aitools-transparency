// Minutes spent on each screen, per group, from the TimeLog saved in
// data/experiment-collections/. Finds where groups get stuck.
//
//   npm run timings                    participant groups only
//   npm run timings -- --include-dev   also the "Tester une condition" runs
//   npm run timings -- --csv out.csv   also write one row per group
//
// A screen's time runs until the next screen. A group that never reached the
// end shows where it stopped; the screen it stopped on has no time.

import { writeFileSync } from "node:fs";
import process from "node:process";
import { COLLECTION_DIR, isSlow, median, readSessions, SLOW_FACTOR } from "./sessionTimings.mjs";

const args = process.argv.slice(2);
const includeDev = args.includes("--include-dev");
const csvIndex = args.indexOf("--csv");
const csvPath = csvIndex === -1 ? null : args[csvIndex + 1];

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

let result;

try {
  result = readSessions({ includeDev });
} catch {
  console.error(`Dossier introuvable: ${COLLECTION_DIR}`);
  process.exit(1);
}

const { sessions, screens, medians, withoutLog } = result;
const statusOf = (session) => (session.isFinished ? "fini" : `arrêté: ${session.currentScreen ?? "?"}`);

if (sessions.length === 0) {
  console.log("Aucune session avec un TimeLog.");
  process.exit(0);
}

console.log(`\nMinutes par écran (! = plus de ${SLOW_FACTOR}× la médiane)\n`);
printTable(
  ["cond", "groupe", "statut", ...screens, "total", "aide", "vérif", "gini", "dinos"],
  sessions.map((session) => [
    session.condition,
    session.group,
    statusOf(session),
    ...screens.map((screen) => {
      const value = session.minutes[screen];

      return `${formatMinutes(value)}${isSlow(medians, screen, value) ? "!" : ""}`;
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
      formatMinutes(median(valuesFor((session) => (session.isFinished ? session.total : null)))),
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
    statusOf(session),
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
