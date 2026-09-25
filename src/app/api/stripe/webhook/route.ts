import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { db } from "@/lib/supabase";
import { isPlanSlug, planForPriceId } from "@/lib/billing/plans";
import { stripe } from "@/lib/billing/stripe";
import { forgetBilling } from "@/lib/billing/usage";
import { forgetAccount } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cancelada de vez: nao pode sobrescrever uma assinatura mais nova da mesma conta. */
const DEAD = new Set(["canceled", "incomplete_expired"]);

/**
 * Grava no banco o estado ATUAL da assinatura. Sempre relido da Stripe em vez
 * de confiar no corpo do evento: a Stripe entrega fora de ordem e reentrega, e
 * assim o resultado e o mesmo qualquer que seja a ordem (idempotente).
 */
async function syncSubscription(subscriptionId: string, accountIdHint?: string | null) {
  const sub = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];

  const supabase = db();
  let accountId = accountIdHint || sub.metadata?.account_id || null;
  if (!accountId) {
    const { data } = await supabase
      .from("mc_accounts")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    accountId = data?.id ?? null;
  }
  if (!accountId) {
    console.error("[stripe] assinatura sem conta correspondente:", subscriptionId);
    return;
  }

  const { data: current } = await supabase
    .from("mc_accounts")
    .select("stripe_subscription_id")
    .eq("id", accountId)
    .maybeSingle();
  if (DEAD.has(sub.status) && current?.stripe_subscription_id && current.stripe_subscription_id !== sub.id) {
    return;
  }

  // O plano vem do preco cobrado; o metadata so cobre variavel de preco ausente.
  const metaPlan = sub.metadata?.plan;
  const plan = planForPriceId(item?.price.id) ?? (isPlanSlug(metaPlan) ? metaPlan : null);

  const { error } = await supabase
    .from("mc_accounts")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: item ? new Date(item.current_period_end * 1000).toISOString() : null,
      // Sem plano reconhecido, mantem o que ja estava (nao apaga por engano).
      ...(plan ? { plan } : {}),
    })
    .eq("id", accountId);
  if (error) throw new Error(`Falha ao gravar a assinatura: ${error.message}`);

  forgetBilling(accountId);
  forgetAccount(accountId);
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET não configurada." }, { status: 503 });
  }

  // O corpo cru: a assinatura e calculada sobre os bytes exatos.
  const raw = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    if (!signature) throw new Error("sem assinatura");
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const id = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(id, session.client_reference_id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object.id);
        break;
      default:
        break;
    }
  } catch (err) {
    // 500 faz a Stripe reenviar; como o sync e idempotente, isso e seguro.
    console.error("[stripe] falha ao processar", event.type, err);
    return NextResponse.json({ error: "Falha ao processar." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
