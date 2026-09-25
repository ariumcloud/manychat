import { NextResponse } from "next/server";
import { requireAccountId } from "@/lib/account-context";
import { authorizeUrl, makeState, STATE_COOKIE } from "@/lib/meta/oauth";
import { configStatus } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Comeca a conexao: manda o usuario logado para a tela de autorizacao do Instagram. */
export async function GET(req: Request) {
  if (!configStatus().oauth) {
    return NextResponse.json({ error: "Faltam META_APP_ID e META_APP_SECRET." }, { status: 503 });
  }

  const accountId = await requireAccountId();
  const { nonce, state } = makeState(accountId);

  const res = NextResponse.redirect(authorizeUrl(req, state));
  res.cookies.set(STATE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/instagram",
    maxAge: 600,
  });
  return res;
}
