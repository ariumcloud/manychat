import { NextResponse } from "next/server";
import { configStatus } from "@/lib/env";
import { getAccount, getAccountCached } from "@/lib/repo";
import { debugToken, metaConfig, MetaError } from "@/lib/meta/client";
import { withApi } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Monta a URL pública do webhook a partir dos headers da própria requisição. */
function webhookUrl(req: Request) {
  const headers = req.headers;
  const host = headers.get("x-forwarded-host") ?? headers.get("host") ?? "localhost:3000";
  const proto = headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/api/webhook/instagram`;
}

/** Diagnóstico: o que está configurado, se o token vive e a quem ele pertence. */
async function getHandler(req: Request) {
  const config = configStatus();
  const account = config.supabase ? await getAccountCached().catch(() => null) : null;

  let token: unknown = null;
  let tokenError: string | null = null;
  if (config.token && config.meta) {
    try {
      token = await debugToken();
    } catch (err) {
      tokenError = err instanceof Error ? err.message : String(err);
    }
  }

  return NextResponse.json({
    config,
    account,
    token,
    tokenError,
    meta: metaConfig,
    webhookUrl: webhookUrl(req),
  });
}

/** Reconecta: relê o perfil na Graph API e grava/atualiza a conta. */
async function postHandler() {
  try {
    const account = await getAccount(true);
    return NextResponse.json({ account });
  } catch (err) {
    const detail = err instanceof MetaError ? `${err.message} (HTTP ${err.status})` : String(err);
    return NextResponse.json({ error: detail }, { status: 400 });
  }
}

export const GET = withApi(getHandler);
export const POST = withApi(postHandler);
