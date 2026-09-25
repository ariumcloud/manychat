import { NextResponse } from "next/server";
import { currentSession } from "@/lib/account-context";
import { createSessionValue, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { db } from "@/lib/supabase";

export const runtime = "nodejs";

/** O dono abre o painel de outra conta (ex.: para ajudar um cliente). */
export async function POST(req: Request) {
  const session = await currentSession();
  const secret = process.env.AUTH_SECRET;
  if (!secret || session?.role !== "admin") {
    return NextResponse.json({ error: "Somente o dono." }, { status: 403 });
  }

  const { accountId } = (await req.json().catch(() => ({}))) as { accountId?: string };
  if (!accountId) return NextResponse.json({ error: "Informe a conta." }, { status: 400 });

  const { data } = await db().from("mc_accounts").select("id").eq("id", accountId).maybeSingle();
  if (!data) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    SESSION_COOKIE,
    await createSessionValue({ accountId: data.id, role: "admin" }, secret),
    sessionCookieOptions,
  );
  return res;
}
