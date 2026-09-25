import { NextResponse } from "next/server";
import { requireAccountId } from "@/lib/account-context";
import { db } from "@/lib/supabase";
import { completeAuthorization, publicOrigin, readState, STATE_COOKIE } from "@/lib/meta/oauth";
import { saveAccessToken } from "@/lib/meta/token";
import { forgetAccount } from "@/lib/repo";
import { MetaError } from "@/lib/meta/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function back(req: Request, status: string) {
  const res = NextResponse.redirect(`${publicOrigin(req)}/dashboard/configuracoes?ig=${encodeURIComponent(status)}`);
  res.cookies.set(STATE_COOKIE, "", { path: "/api/instagram", maxAge: 0 });
  return res;
}

/**
 * Volta do Instagram com ?code. So aceita se o state foi emitido para a conta
 * que esta logada agora (e bate com o cookie): sem isso, alguem poderia amarrar
 * o Instagram dele ao painel de outra pessoa.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back(req, "negado");

  const code = url.searchParams.get("code");
  const state = readState(url.searchParams.get("state"));
  const cookieNonce = req.headers
    .get("cookie")
    ?.split(/;\s*/)
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  const accountId = await requireAccountId();
  if (!code || !state || state.accountId !== accountId || !cookieNonce || cookieNonce !== state.nonce) {
    return back(req, "invalido");
  }

  try {
    const profile = await completeAuthorization(req, code);

    // Cada Instagram pertence a um painel so.
    const { data: owner } = await db()
      .from("mc_accounts")
      .select("id")
      .eq("ig_user_id", profile.igUserId)
      .maybeSingle();
    if (owner && owner.id !== accountId) return back(req, "em-uso");

    const { error } = await db()
      .from("mc_accounts")
      .update({
        ig_user_id: profile.igUserId,
        username: profile.username,
        name: profile.name,
        profile_picture_url: profile.profilePictureUrl,
        followers_count: profile.followersCount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", accountId);
    if (error) throw new Error(error.message);

    await saveAccessToken(accountId, profile.accessToken, profile.expiresInSeconds);
    forgetAccount(accountId);

    return back(req, profile.webhookSubscribed ? "ok" : "ok-sem-webhook");
  } catch (err) {
    console.error("[oauth] falha ao conectar:", err instanceof MetaError ? err.message : err);
    return back(req, "erro");
  }
}
