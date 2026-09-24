import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { refreshLongLivedToken } from "@/lib/meta/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Renova o token de longa duração agora (o cron semanal faz o mesmo sozinho).
 * O token novo fica gravado no banco e passa a ser usado na hora — nada para
 * colar na Vercel, e ele nunca volta para o navegador.
 */
async function postHandler() {
  const { expiresInSeconds, permissions } = await refreshLongLivedToken();

  return NextResponse.json({
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    days: Math.round(expiresInSeconds / 86400),
    permissions,
  });
}

export const POST = withApi(postHandler);
