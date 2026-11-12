// Minutes per screen from the TimeLog of each saved session. Shared by
// scripts/timings.mjs (after class) and /api/experiment/sessions (the
// "Sessions" tab of the start page, live during class).

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export const COLLECTION_DIR = path.join(process.cwd(), "data", "experiment-collections");

export const SCREEN_ORDER = [
  "run1_intro",
  "run1_cards",
  "run1_transition",
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

// A screen is slow when it takes this much longer than its median, and at
// least SLOW_MIN_MINUTES.
export const SLOW_FACTOR = 1.5;
const SLOW_MIN_MINUTES = 1;

function minutesBetween(start, end) {
  return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
}

export function median(values) {
  if (values.length === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

// A screen's time runs until the next screen. For a session that has not
// reached the end, the last screen is still open: currentMinutes is how long
// ago it started (still working, or stopped there).
function summarizeSession(collection, fileName, now) {
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
  const isFinished = last?.name === "end";
  const countActions = (prefix) => actions.filter((entry) => entry.name.startsWith(prefix)).length;

  return {
    fileName,
    condition: collection.Condition ?? "?",
    group: collection.GroupNb ?? "?",
    keys: (collection.UserIDs ?? []).join(" "),
    start: screens[0]?.at ?? collection.StartTime ?? "",
    isFinished,
    currentScreen: isFinished ? null : (last?.name ?? null),
    currentMinutes: isFinished || !last ? null : minutesBetween(last.at, now),
    total: screens.length > 1 ? minutesBetween(screens[0].at, last.at) : null,
    minutes,
    helpOpened: countActions("help_opened"),
    accuracyChecks: countActions("accuracy_check"),
    giniQuestions: countActions("gini_question"),
    treeDinos: countActions("tree_dino"),
  };
}

/** @param {{ includeDev?: boolean, since?: string | null, now?: Date }} [options] */
export function readSessions({ includeDev = false, since = null, now = new Date() } = {}) {
  const fileNames = readdirSync(COLLECTION_DIR).filter((fileName) => fileName.endsWith(".json"));
  const sessions = [];
  let withoutLog = 0;

  fileNames.forEach((fileName) => {
    let collection;

    try {
      collection = JSON.parse(readFileSync(path.join(COLLECTION_DIR, fileName), "utf8"));
    } catch {
      return;
    }

    if (!includeDev && collection.GroupNb === 0) {
      return;
    }

    if (!Array.isArray(collection.TimeLog) || collection.TimeLog.length === 0) {
      withoutLog += 1;
      return;
    }

    const session = summarizeSession(collection, fileName, now);

    if (!since || session.start >= since) {
      sessions.push(session);
    }
  });

  sessions.sort((a, b) => a.condition.localeCompare(b.condition) || a.start.localeCompare(b.start));

  const screens = SCREEN_ORDER.filter((screen) => sessions.some((session) => screen in session.minutes));
  const medians = Object.fromEntries(
    screens.map((screen) => [
      screen,
      median(sessions.map((session) => session.minutes[screen]).filter((value) => value !== undefined)),
    ]),
  );

  return { sessions, screens, medians, withoutLog };
}

export function isSlow(medians, screen, value) {
  return (
    value !== undefined &&
    value !== null &&
    value >= SLOW_MIN_MINUTES &&
    value > SLOW_FACTOR * (medians[screen] ?? Infinity)
  );
}
