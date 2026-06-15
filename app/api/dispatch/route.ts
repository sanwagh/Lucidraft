/**
 * POST /api/dispatch
 *
 * Body: { prompt: string }
 * Returns: DispatchResult -> { id, location, status, createdAt }
 *
 * Hands the approved prompt to the active Dispatcher (the file queue in v1).
 */
import { NextResponse } from "next/server";
import { getDispatcher } from "@/lib/dispatch";

export const runtime = "nodejs";

interface DispatchRequestBody {
  prompt?: string;
  /** Optional working directory (claude-cli dispatcher only). */
  cwd?: string;
}

export async function POST(req: Request) {
  let body: DispatchRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "`prompt` is required." }, { status: 400 });
  }

  try {
    const dispatcher = getDispatcher();
    const result = await dispatcher.dispatch(prompt, { cwd: body.cwd });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error.";
    console.error("[tandem] /api/dispatch failed:", message);
    return NextResponse.json(
      { error: `Dispatch failed: ${message}` },
      { status: 500 }
    );
  }
}
