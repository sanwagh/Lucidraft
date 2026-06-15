/**
 * GET /api/config
 *
 * Exposes a little non-secret config the client needs to render correctly —
 * currently just which dispatcher is active, so the UI knows whether to show
 * the per-project "working directory" field (only relevant for claude-cli).
 */
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const dispatcher = (process.env.TANDEM_DISPATCHER || "file-queue").toLowerCase();
  return NextResponse.json({ dispatcher });
}
