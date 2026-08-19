import { NextResponse } from "next/server";
import { listMedia, MetaError } from "@/lib/meta/client";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Posts do IG, para prender um gatilho a um post específico. */
async function getHandler() {
  try {
    return NextResponse.json({ media: await listMedia(50) });
  } catch (err) {
    const detail = err instanceof MetaError ? err.message : String(err);
    return NextResponse.json({ media: [], error: detail }, { status: 200 });
  }
}

export const GET = withApi(getHandler);
