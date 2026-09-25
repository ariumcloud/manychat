import { NextResponse } from "next/server";
import { requireAccountId } from "@/lib/account-context";
import { withApi } from "@/lib/api";
import { db } from "@/lib/supabase";
import { stripe } from "@/lib/billing/stripe";
import { publicOrigin } from "@/lib/meta/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Portal da Stripe: o cliente troca cartao, muda de plano, cancela e baixa faturas. */
async function postHandler(req: Request) {
  const accountId = await requireAccountId();
  const { data: account } = await db()
    .from("mc_accounts")
    .select("stripe_customer_id")
    .eq("id", accountId)
    .maybeSingle();

  if (!account?.stripe_customer_id) {
    return NextResponse.json({ error: "Esta conta ainda não tem assinatura." }, { status: 400 });
  }

  const session = await stripe().billingPortal.sessions.create({
    customer: account.stripe_customer_id,
    return_url: `${publicOrigin(req)}/dashboard/plano`,
  });
  return NextResponse.json({ url: session.url });
}

export const POST = withApi(postHandler);
