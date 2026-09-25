import { NextResponse } from "next/server";
import { configStatus } from "@/lib/env";
import { getAccount, getAccountCached } from "@/lib/repo";
import { inspectToken, metaConfig, MetaError } from "@/lib/meta/client";
import { withApi } from "@/lib/api";
import { currentSession } from "@/lib/account-context";
import { PENDING_PREFIX } from "@/lib/meta/token";
import { getUsage } from "@/lib/billing/usage";
import { FREE_PLAN, PLANS, isFreePlan, isPlanSlug, priceIdFor, type PlanSlug } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";

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
  const session = await currentSession();
  const connected = Boolean(account) && !account!.ig_user_id.startsWith(PENDING_PREFIX);
  const token = connected ? await inspectToken() : null;

  const free = isFreePlan(account?.plan);
  const plan = account?.plan && isPlanSlug(account.plan) ? account.plan : null;
  const usage = account ? await getUsage(account.id).catch(() => null) : null;
  const billing = {
    // Checkout so liga quando a Stripe e os precos estao configurados.
    ready: stripeConfigured(),
    plan: free ? FREE_PLAN.slug : plan,
    free,
    planName: free ? FREE_PLAN.name : plan ? PLANS[plan].name : null,
    status: account?.subscription_status ?? null,
    periodEnd: account?.current_period_end ?? null,
    used: usage?.used ?? 0,
    limit: free ? FREE_PLAN.messages : plan ? PLANS[plan].messages : null,
    available: (Object.keys(PLANS) as PlanSlug[])
      .filter((slug) => priceIdFor(slug))
      .map((slug) => ({ slug, name: PLANS[slug].name, price: PLANS[slug].price })),
  };

  return NextResponse.json({
    config,
    account,
    role: session?.role ?? null,
    billing,
    connected,
    token,
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
