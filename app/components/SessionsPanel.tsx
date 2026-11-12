"use client";

import { useEffect, useState } from "react";

// "Sessions" tab of the start page: minutes per screen for every group, from
// /api/experiment/sessions. Refreshes on its own so it can stay open during
// class: running groups show the screen they are on and for how long.

type Session = {
  fileName: string;
  condition: string;
  group: number | string;
  start: string;
  isFinished: boolean;
  currentScreen: string | null;
  currentMinutes: number | null;
  total: number | null;
  minutes: Record<string, number>;
  helpOpened: number;
  accuracyChecks: number;
  giniQuestions: number;
  treeDinos: number;
  slowScreens: string[];
  isCurrentSlow: boolean;
};

type SessionsResponse = {
  now: string;
  screens: string[];
  conditionMedians: Record<string, { count: number; total: number | null; minutes: Record<string, number | null> }>;
  withoutLog: number;
  sessions: Session[];
};

const REFRESH_SECONDS = 10;
// Past this, an unfinished session is probably closed rather than still working.
const IDLE_MINUTES = 20;

const SCREEN_LABELS: Record<string, string> = {
  run1_intro: "BN intro",
  run1_cards: "BN cartes",
  run1_transition: "BN fin",
  mission: "Mission",
  data_labelling: "Fiches",
  feature_selection: "Caract.",
  data_preparation: "Données",
  model_training: "Entraîn.",
  model_guess: "Devinette",
  model_tree: "Arbre",
  model_gini: "Gini",
  evaluation: "Éval.",
  eval_cards: "Cartes",
  eval_accuracy: "Précision",
};

function formatMinutes(value: number | null | undefined) {
  return value === null || value === undefined ? "" : value.toFixed(1);
}

function formatClock(iso: string) {
  return iso ? new Date(iso).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" }) : "";
}

function startOfToday() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function StatusChip({ session }: { session: Session }) {
  if (session.isFinished) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-[2px] text-emerald-700">
        fini · {formatMinutes(session.total)} min
      </span>
    );
  }

  const screen = SCREEN_LABELS[session.currentScreen ?? ""] ?? session.currentScreen ?? "?";
  const minutes = session.currentMinutes ?? 0;

  if (minutes >= IDLE_MINUTES) {
    return (
      <span className="rounded-full bg-zinc-100 px-2 py-[2px] text-zinc-500">
        arrêté ? {screen} · {Math.round(minutes)} min
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-2 py-[2px] ${
        session.isCurrentSlow ? "bg-red-50 font-semibold text-red-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      {screen} depuis {formatMinutes(minutes)} min
    </span>
  );
}

export function SessionsPanel() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [todayOnly, setTodayOnly] = useState(true);
  const [includeDev, setIncludeDev] = useState(false);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      const params = new URLSearchParams();

      if (todayOnly) params.set("since", startOfToday());
      if (includeDev) params.set("dev", "1");

      try {
        const response = await fetch(`/api/experiment/sessions?${params}`, { cache: "no-store" });
        const nextData = (await response.json()) as SessionsResponse;

        if (isActive) {
          setData(nextData);
          setErrorMessage(null);
        }
      } catch {
        if (isActive) {
          setErrorMessage("Impossible de charger les sessions.");
        }
      }
    };

    load();
    const interval = window.setInterval(load, REFRESH_SECONDS * 1000);

    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
  }, [todayOnly, includeDev]);

  const screens = data?.screens ?? [];
  const sessions = data?.sessions ?? [];
  const running = sessions.filter(
    (session) => !session.isFinished && (session.currentMinutes ?? 0) < IDLE_MINUTES,
  ).length;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-zinc-500">
          {sessions.length} session{sessions.length > 1 ? "s" : ""} · {running} en cours · mis à jour à{" "}
          {data ? formatClock(data.now) : "…"} (toutes les {REFRESH_SECONDS} s)
        </p>
        <div className="flex items-center gap-4 text-zinc-600">
          <label className="flex items-center gap-2">
            <input checked={todayOnly} onChange={(event) => setTodayOnly(event.target.checked)} type="checkbox" />
            Aujourd&apos;hui seulement
          </label>
          <label className="flex items-center gap-2">
            <input checked={includeDev} onChange={(event) => setIncludeDev(event.target.checked)} type="checkbox" />
            Inclure les tests
          </label>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}

      {sessions.length === 0 ? (
        <p className="rounded-2xl bg-zinc-50 p-6 text-center text-zinc-500">
          {data ? "Aucune session pour l'instant." : "Chargement…"}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-zinc-200">
          <table className="w-full border-collapse text-left text-sm" data-sessions-table>
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                <th className="px-3 py-2 font-medium">Groupe</th>
                <th className="px-3 py-2 font-medium">Début</th>
                <th className="px-3 py-2 font-medium">Où en est-il</th>
                {screens.map((screen) => (
                  <th className="px-2 py-2 text-right font-medium" key={screen}>
                    {SCREEN_LABELS[screen] ?? screen}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-medium">Total</th>
                <th className="px-2 py-2 text-right font-medium" title="Clics sur « Euh je dois faire quoi déjà ? »">
                  Aide
                </th>
                <th className="px-2 py-2 text-right font-medium" title="Clics sur « Vérifier mes réponses »">
                  Vérif.
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr className="border-t border-zinc-100" key={session.fileName}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium">
                    {session.condition} · {session.group === 0 ? "test" : `G${session.group}`}
                  </td>
                  <td className="px-3 py-2 text-zinc-500">{formatClock(session.start)}</td>
                  <td className="whitespace-nowrap px-3 py-2">
                    <StatusChip session={session} />
                  </td>
                  {screens.map((screen) => {
                    const isSlow = session.slowScreens.includes(screen);

                    return (
                      <td
                        className={`px-2 py-2 text-right tabular-nums ${isSlow ? "bg-red-50 font-semibold text-red-700" : ""}`}
                        key={screen}
                        title={isSlow ? "Plus lent que d'habitude sur cet écran" : undefined}
                      >
                        {formatMinutes(session.minutes[screen])}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right font-medium tabular-nums">
                    {session.isFinished ? formatMinutes(session.total) : ""}
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums ${session.helpOpened > 0 ? "text-amber-700" : "text-zinc-400"}`}>
                    {session.helpOpened}
                  </td>
                  <td className={`px-2 py-2 text-right tabular-nums ${session.accuracyChecks > 2 ? "text-amber-700" : "text-zinc-400"}`}>
                    {session.accuracyChecks}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-zinc-50 text-zinc-500">
              {Object.entries(data?.conditionMedians ?? {}).map(([condition, medians]) => (
                <tr className="border-t border-zinc-200" key={condition}>
                  <td className="px-3 py-2 font-medium" colSpan={3}>
                    Médiane {condition} ({medians.count})
                  </td>
                  {screens.map((screen) => (
                    <td className="px-2 py-2 text-right tabular-nums" key={screen}>
                      {formatMinutes(medians.minutes[screen])}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-right tabular-nums">{formatMinutes(medians.total)}</td>
                  <td colSpan={2} />
                </tr>
              ))}
            </tfoot>
          </table>
        </div>
      )}

      <p className="text-xs text-zinc-400">
        Minutes par écran. En rouge: plus de 1,5× la médiane de cet écran. Un écran compte jusqu&apos;à l&apos;écran
        suivant. Les temps sont par ordinateur. Résumé complet après la classe: npm run timings.
        {!todayOnly && data?.withoutLog ? ` ${data.withoutLog} session(s) plus anciennes sans mesure du temps ne sont pas affichées.` : ""}
      </p>
    </div>
  );
}
