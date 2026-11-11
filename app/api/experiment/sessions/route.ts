import { NextResponse } from "next/server";
import { isSlow, median, readSessions } from "@/scripts/sessionTimings.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMPTY = { screens: [], medians: {}, conditionMedians: {}, withoutLog: 0, sessions: [] };

// Time per screen of every saved session, for the "Sessions" tab of the start
// page. ?dev=1 adds the test runs; ?since=<ISO date> keeps sessions started
// after it. Participant keys are left out. Slow cells and medians are worked
// out here so the page needs no copy of the rules.
export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const now = new Date();

  try {
    const { sessions, screens, medians, withoutLog } = readSessions({
      includeDev: searchParams.get("dev") === "1",
      since: searchParams.get("since"),
      now,
    });
    const conditions = [...new Set(sessions.map((session) => session.condition))];
    const conditionMedians = Object.fromEntries(
      conditions.map((condition) => {
        const group = sessions.filter((session) => session.condition === condition);
        const values = (pick: (session: (typeof sessions)[number]) => number | null | undefined) =>
          group.map(pick).filter((value): value is number => typeof value === "number");

        return [
          condition,
          {
            count: group.length,
            total: median(values((session) => (session.isFinished ? session.total : null))),
            minutes: Object.fromEntries(
              screens.map((screen) => [screen, median(values((session) => session.minutes[screen]))]),
            ),
          },
        ];
      }),
    );

    return NextResponse.json({
      now: now.toISOString(),
      screens,
      medians,
      conditionMedians,
      withoutLog,
      sessions: sessions.map((session) => ({
        ...session,
        keys: undefined,
        slowScreens: screens.filter((screen) => isSlow(medians, screen, session.minutes[screen])),
        isCurrentSlow: Boolean(
          session.currentScreen && isSlow(medians, session.currentScreen, session.currentMinutes),
        ),
      })),
    });
  } catch {
    return NextResponse.json({ now: now.toISOString(), ...EMPTY });
  }
}
