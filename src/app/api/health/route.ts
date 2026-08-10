import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight liveness probe; deliberately does not disclose configuration. */
export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      revision: process.env.APP_REVISION ?? "development",
    },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
