import { NextResponse } from "next/server";
import { requireAccountId } from "@/lib/account-context";
import { db } from "@/lib/supabase";
import { isPlanSlug, priceIdFor } from "@/lib/billing/plans";
import { stripe, stripeConfigured } from "@/lib/billing/stripe";
import { publicOrigin } from "@/lib/meta/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACTIVE = new Set(["active", "trialing", "past_due"]);

/**
 * Leva o cliente logado ao checkout da Stripe do plano escolhido
 * (/api/stripe/checkout?plan=pro). GET de proposito: a pagina de planos e o
 * cadastro so precisam linkar para ca.
 *
 * O plano NAO vem do retorno do checkout: quem grava o plano e o webhook, a
 * partir do preco que a Stripe de fato cobrou.
 */
export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const back = (status: string) =>
    NextResponse.redirect(`${origin}/dashboard/plano?assinatura=${status}`, 303);

  const plan = new URL(req.url).searchParams.get("plan");
  if (!isPlanSlug(plan)) return back("plano-invalido");

  const priceId = priceIdFor(plan);
  if (!stripeConfigured() || !priceId) return back("indisponivel");

  const accountId = await requireAccountId();
  const { data: account } = await db()
    .from("mc_accounts")
    .select("id, login, stripe_customer_id, subscription_status")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return back("erro");

  // Quem ja assina troca de plano ou cancela no portal, sem pagar duas vezes.
  if (ACTIVE.has(account.subscription_status ?? "")) return back("ja-ativa");

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    client_reference_id: account.id,
    metadata: { account_id: account.id, plan },
    subscription_data: { metadata: { account_id: account.id, plan } },
    allow_promotion_codes: true,
    ...(account.stripe_customer_id
      ? { customer: account.stripe_customer_id }
      : account.login?.includes("@")
        ? { customer_email: account.login }
        : {}),
    success_url: `${origin}/dashboard/plano?assinatura=ok`,
    cancel_url: `${origin}/dashboard/plano?assinatura=cancelada`,
  });

  if (!session.url) return back("erro");
  return NextResponse.redirect(session.url, 303);
}
