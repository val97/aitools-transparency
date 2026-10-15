import { mkdir, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type ExperimentCollectionPayload = Record<string, unknown>;

const COLLECTION_DIR = path.join(process.cwd(), "data", "experiment-collections");
const COLLECTION_LOG_FILE = path.join(COLLECTION_DIR, "collections.jsonl");

function safeFilePart(value: unknown, fallback: string) {
  if (typeof value !== "string" && typeof value !== "number") {
    return fallback;
  }

  const safeValue = String(value).replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-");

  return safeValue || fallback;
}

function validateCollection(payload: unknown): payload is ExperimentCollectionPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const candidate = payload as ExperimentCollectionPayload;
  const condition = candidate.Condition;

  return (
    condition === "C1" ||
    condition === "C2" ||
    condition === "C3" ||
    condition === "C4" ||
    condition === "C5" ||
    condition === "C6" ||
    condition === "C7"
  );
}

export async function POST(request: Request) {
  const payload = (await request.json()) as unknown;

  if (!validateCollection(payload)) {
    return NextResponse.json({ error: "Invalid experiment collection payload." }, { status: 400 });
  }

  const receivedAt = new Date().toISOString();
  const startTime = safeFilePart(payload.StartTime, receivedAt);
  const condition = safeFilePart(payload.Condition, "condition");
  const group = safeFilePart(payload.GroupNb, "group");
  const userIds = Array.isArray(payload.UserIDs) ? payload.UserIDs.map((id) => safeFilePart(id, "id")).join("_") : "ids";
  const fileName = `${condition}_G${group}_${userIds}_${startTime}.json`;

  try {
    await mkdir(COLLECTION_DIR, { recursive: true });
    await writeFile(path.join(COLLECTION_DIR, fileName), JSON.stringify(payload, null, 2), "utf8");
    await appendFile(COLLECTION_LOG_FILE, `${JSON.stringify(payload)}\n`, "utf8");

    return NextResponse.json({ ok: true, fileName, collection: payload });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to save experiment collection.",
      },
      { status: 500 },
    );
  }
}
