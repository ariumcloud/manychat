import { NextResponse } from "next/server";
import { getAccount } from "@/lib/repo";
import { withApi } from "@/lib/api";
import { createAutomation, type AutomationInput } from "@/lib/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Atalho do painel: cria o fluxo e o gatilho numa tacada so, ja publicado. */
async function postHandler(req: Request) {
  const account = await getAccount();
  const body = (await req.json().catch(() => ({}))) as AutomationInput;
  const result = await createAutomation(account.id, body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ trigger: result.trigger, flow: result.flow });
}

export const POST = withApi(postHandler);
