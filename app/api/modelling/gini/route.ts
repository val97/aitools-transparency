import { NextResponse } from "next/server";

export const runtime = "nodejs";

const FASTAPI_URL = process.env.FASTAPI_URL ?? "http://localhost:8000";

type GiniRequest = {
  features?: unknown;
  labels?: unknown;
  filters?: unknown;
  dataFile?: unknown;
};

type SplitFilter = {
  feature: string;
  operator: "eq" | "gte";
  value: string | number | boolean;
  branch: "yes" | "no";
};

function isSplitFilter(value: unknown): value is SplitFilter {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.feature === "string" &&
    (candidate.operator === "eq" || candidate.operator === "gte") &&
    (typeof candidate.value === "string" ||
      typeof candidate.value === "number" ||
      typeof candidate.value === "boolean") &&
    (candidate.branch === "yes" || candidate.branch === "no")
  );
}

async function backendErrorMessage(response: Response) {
  try {
    const payload = (await response.clone().json()) as { detail?: unknown; error?: unknown };
    const message = payload.detail ?? payload.error;

    if (typeof message === "string") {
      return message;
    }
  } catch {
    // Fall through to the plain-text response body.
  }

  return response.text();
}

export async function POST(request: Request) {
  const body = (await request.json()) as GiniRequest;
  const features = Array.isArray(body.features)
    ? body.features.filter((feature): feature is string => typeof feature === "string")
    : [];
  const labels =
    body.labels && typeof body.labels === "object" && !Array.isArray(body.labels)
      ? Object.fromEntries(
          Object.entries(body.labels).filter(
            (entry): entry is [string, string] =>
              typeof entry[0] === "string" &&
              (entry[1] === "herbivore" || entry[1] === "carnivore"),
          ),
        )
      : {};
  const filters = Array.isArray(body.filters) ? body.filters.filter(isSplitFilter) : [];
  const dataFile = "df_train.csv";

  try {
    const response = await fetch(`${FASTAPI_URL}/gini`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features, labels, filters, dataFile }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: await backendErrorMessage(response) }, { status: 500 });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to reach the Python backend. Is it running on port 8000?",
      },
      { status: 500 },
    );
  }
}
