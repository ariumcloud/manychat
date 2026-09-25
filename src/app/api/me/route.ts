import { NextResponse } from "next/server";
import { currentSession } from "@/lib/account-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Quem esta logado (so o papel): barato, para telas que mostram recursos so do dono. */
export async function GET() {
  const session = await currentSession();
  return NextResponse.json({ role: session?.role ?? null });
}
