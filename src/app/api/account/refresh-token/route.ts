import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { refreshLongLivedToken } from "@/lib/meta/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Renova o token de longa duração. Só roda por ação explícita — devolve um
 * token NOVO, que você precisa colar no .env.local e nas variáveis da Vercel.
 *
 * É também a única forma de ver validade e permissões de um token de
 * Instagram Login: o /debug_token do Facebook não funciona com ele.
 */
async function postHandler() {
  const { accessToken, expiresInSeconds, permissions } = await refreshLongLivedToken();

  const days = Math.round(expiresInSeconds / 86400);
  const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

  return NextResponse.json({
    accessToken,
    expiresAt,
    days,
    permissions,
  });
}

export const POST = withApi(postHandler);
